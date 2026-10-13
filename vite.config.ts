import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DEFAULT_API_PROXY_TARGET =
  'https://2ky37g6kcgsboe6xos5ida6ohe0rnwnk.lambda-url.ap-south-1.on.aws'

const DEFAULT_V2_PROXY_TARGET = 'https://api.aptdemo.atoms.trade'

const DEFAULT_HEALTH_V3_PROXY_TARGET = 'https://api.webtest.apt.trading'

function parseSessionTokenFromSetCookie(
  setCookie: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie ?? ''
  const match = raw.match(/session_token=([^;]+)/i)
  return match?.[1]?.trim() ?? null
}

/** Browser fetch cannot set Cookie — Vite proxy converts Authorization session UUID → Cookie for aptdemo. */
function aptdemoAggregateProxy(target: string): ProxyOptions {
  const SESSION_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  return {
    target,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const auth = req.headers.authorization?.trim()
        if (auth && SESSION_RE.test(auth)) {
          proxyReq.setHeader('Cookie', `session_token=${auth}`)
          proxyReq.removeHeader('authorization')
        }
      })
    },
  }
}

/** Browser fetch cannot read Set-Cookie — inject session_token into login JSON body. */
function aptdemoLoginProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    configure: (proxy) => {
      proxy.on('proxyRes', (proxyRes, req, res) => {
        const chunks: Buffer[] = []
        proxyRes.on('data', (chunk?: Buffer) => {
          if (chunk) chunks.push(chunk)
        })
        proxyRes.on('end', () => {
          let bodyText = Buffer.concat(chunks).toString('utf8')
          const sessionToken = parseSessionTokenFromSetCookie(proxyRes.headers['set-cookie'])

          if (
            sessionToken &&
            req.method === 'POST' &&
            req.url?.includes('/users/login')
          ) {
            try {
              const json = JSON.parse(bodyText) as {
                data?: Record<string, unknown> | string
              }
              const data =
                json.data && typeof json.data === 'object' && !Array.isArray(json.data)
                  ? json.data
                  : {}
              json.data = { ...data, session_token: sessionToken }
              bodyText = JSON.stringify(json)
            } catch {
              // keep original body
            }
          }

          const headers = { ...proxyRes.headers }
          delete headers['content-length']
          res.writeHead(proxyRes.statusCode ?? 200, headers)
          res.end(bodyText)
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || DEFAULT_API_PROXY_TARGET
  const v2ProxyTarget =
    env.VITE_V2_PROXY_TARGET?.trim() ||
    env.VITE_MAIN_API_PROXY_TARGET?.trim() ||
    DEFAULT_V2_PROXY_TARGET
  const healthV3ProxyTarget =
    env.VITE_HEALTH_V3_PROXY_TARGET?.trim() || DEFAULT_HEALTH_V3_PROXY_TARGET

  const brandConfigMockTarget =
    env.VITE_BRAND_CONFIG_MOCK_TARGET?.trim() || 'http://localhost:3000'
  const brandConfigUseAptdemo =
    env.VITE_BRAND_CONFIG_USE_APTDEMO?.trim().toLowerCase() === 'true'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        '/health': { target: apiProxyTarget, changeOrigin: true },
        ...(brandConfigUseAptdemo
          ? {
              '/v2/users/login': aptdemoLoginProxy(v2ProxyTarget),
              '/v2/aggregate': aptdemoAggregateProxy(v2ProxyTarget),
            }
          : {
              '/v2/users/login': { target: brandConfigMockTarget, changeOrigin: true },
              '/v2/aggregate': { target: brandConfigMockTarget, changeOrigin: true },
            }),
        '/v2': { target: v2ProxyTarget, changeOrigin: true },
        '/v3': { target: healthV3ProxyTarget, changeOrigin: true },
      },
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
