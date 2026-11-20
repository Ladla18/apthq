import { useState, type FormEvent } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { Badge, SectionHeader } from '../ui/Shared'

const inputClass =
  'h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none'

const SELECTED_CLIENT_LOGIN_PATH = '/v2/active_users/selected_client/login'

const PARTNER_APIS = [
  { id: 'smc', label: 'SMC', environment: 'prod', brokerName: 'smcodin', apiUrl: 'https://api.algoai.smctradeonline.com' },
  { id: 'tradebulls', label: 'Tradebulls', environment: 'prod', brokerName: 'tradebulls', apiUrl: 'https://api.aptalgo.tradebulls.in' },
  { id: 'tradesmart', label: 'Tradesmart', environment: 'prod', brokerName: 'tradesmart', apiUrl: 'https://api.smartalgo.tradesmartonline.in' },
  { id: 'devclients', label: 'Dev clients (Navia)', environment: 'dev', brokerName: 'navia', apiUrl: 'https://api.dev.atoms.trade' },
  { id: 'bajaj', label: 'Bajaj', environment: 'prod', brokerName: 'bajaj', apiUrl: 'https://api.algotrade.bajajbroking.in' },
  { id: 'navia', label: 'Navia', environment: 'prod', brokerName: 'navia', apiUrl: 'https://api.algotrade.navia.co.in' },
  { id: 'bajaj-trial', label: 'Bajaj trial', environment: 'prod', brokerName: 'navia', apiUrl: 'https://api.bajaj.atoms.trade' },
  { id: 'new-test', label: 'New test (Apt)', environment: 'dev', brokerName: 'tradebulls', apiUrl: 'https://api.webtest.apt.trading' },
  { id: 'stoxkart', label: 'Stoxkart', environment: 'prod', brokerName: 'stoxkart', apiUrl: 'https://api.stoxkart.atoms.trade' },
  { id: 'moneysukh', label: 'Moneysukh', environment: 'prod', brokerName: 'moneysukh', apiUrl: 'https://api.algo360.moneysukh.com' },
  { id: 'globecapital', label: 'Globe Capital', environment: 'prod', brokerName: 'globe', apiUrl: 'https://api.aialgo.globecapitalonline.com' },
  { id: 'custom', label: 'Custom URL', environment: '', brokerName: '', apiUrl: '' },
] as const

function selectedClientLoginUrl(apiUrl: string): string {
  const base = apiUrl.trim().replace(/\/$/, '')
  return base ? `${base}${SELECTED_CLIENT_LOGIN_PATH}` : ''
}

export function InternalUserRedirectPanel() {
  const { authEmail } = useDashboard()
  const [partnerId, setPartnerId] = useState<(typeof PARTNER_APIS)[number]['id']>('tradebulls')
  const [customUrl, setCustomUrl] = useState('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState('Waiting.')
  const isInternalUser = authEmail?.toLowerCase().endsWith('@apt.trading') ?? false
  const selectedPartner = PARTNER_APIS.find((partner) => partner.id === partnerId) ?? PARTNER_APIS[0]
  const apiUrl =
    partnerId === 'custom' ? customUrl.trim() : selectedClientLoginUrl(selectedPartner.apiUrl)

  const validate = (): boolean => {
    if (!isInternalUser) {
      setInputError('Only internal users can run selected-client redirect.')
      return false
    }
    if (!apiUrl.trim()) {
      setInputError('API URL is required.')
      return false
    }
    if (!userId.trim()) {
      setInputError('User ID is required.')
      return false
    }
    if (!password.trim()) {
      setInputError('Password is required.')
      return false
    }
    if (!otp.trim()) {
      setInputError('OTP is required.')
      return false
    }
    setInputError(null)
    return true
  }

  const onFollowRedirect = (e: FormEvent<HTMLFormElement>) => {
    if (!validate()) {
      e.preventDefault()
      return
    }
    setResultMessage('Posting form. Browser should leave this page on 302 redirect.')
  }

  const runInspect = async () => {
    if (!validate()) return

    setResultMessage('Sending JSON POST with redirect: manual...')

    try {
      const res = await fetch(apiUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        redirect: 'manual',
        body: JSON.stringify({
          user_id: userId.trim(),
          password,
          otp: otp.trim(),
        }),
      })

      const lines: string[] = [
        `type: ${res.type}`,
        `status: ${res.status}`,
        `ok: ${String(res.ok)}`,
        `url: ${res.url}`,
        `location header: ${res.headers.get('location') || '(not exposed to script)'}`,
      ]

      if (res.type === 'opaqueredirect' || res.status === 0) {
        lines.push('', 'Opaque 302. Use "Follow redirect" to land on target app.')
      } else {
        const text = await res.text()
        lines.push('', text.slice(0, 800))
      }

      setResultMessage(lines.join('\n'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setResultMessage(`Request failed: ${message}`)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Internal User Redirect"
        titleColor="var(--live)"
        badge={<Badge variant="live">Access</Badge>}
        lineColor="var(--live-bd)"
      />

      <div className="mb-4 rounded-[var(--rlg)] border border-[var(--border2)] bg-[var(--s1)] p-3 text-xs leading-relaxed text-[var(--text2)]">
        Follow redirect posts a normal form and lets browser follow 302. Inspect 302 sends the
        same body as JSON with <span className="font-mono-dm">redirect: manual</span>.
      </div>

      <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-[18px]">
        {!isInternalUser ? (
          <p className="mb-3 text-xs text-[var(--amber)]">
            This action is restricted to internal users (`@apt.trading`).
          </p>
        ) : null}

        <form className="mb-3" method="post" action={apiUrl.trim()} onSubmit={onFollowRedirect}>
          <label className="mb-3 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
            Partner API
            <select
              className={`${inputClass} mt-1`}
              value={partnerId}
              disabled={!isInternalUser}
              onChange={(e) => {
                setPartnerId(e.target.value as (typeof PARTNER_APIS)[number]['id'])
                setInputError(null)
              }}
            >
              {PARTNER_APIS.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.id === 'custom'
                    ? partner.label
                    : `${partner.label} · ${partner.environment} · ${partner.brokerName}`}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
            API URL
            <input
              className={`${inputClass} mt-1 font-mono-dm`}
              value={partnerId === 'custom' ? customUrl : apiUrl}
              readOnly={partnerId !== 'custom'}
              disabled={!isInternalUser}
              onChange={(e) => {
                setCustomUrl(e.target.value)
                setInputError(null)
              }}
              placeholder="https://api.aptalgo.tradebulls.in/v2/active_users/selected_client/login"
            />
          </label>
          <p className="mb-3 text-[11px] text-[var(--text3)]">
            Login path is <span className="font-mono-dm">{SELECTED_CLIENT_LOGIN_PATH}</span> on the
            selected partner <span className="font-mono-dm">api_url</span>.
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Client user_id
              <input
                name="user_id"
                className={`${inputClass} mt-1 font-mono-dm`}
                value={userId}
                disabled={!isInternalUser}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setInputError(null)
                }}
                placeholder="wahe"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Client password
              <input
                name="password"
                type="password"
                className={`${inputClass} mt-1 font-mono-dm`}
                value={password}
                disabled={!isInternalUser}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setInputError(null)
                }}
                placeholder="••••••••"
                autoComplete="off"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Client OTP
              <input
                name="otp"
                className={`${inputClass} mt-1 font-mono-dm`}
                value={otp}
                disabled={!isInternalUser}
                onChange={(e) => {
                  setOtp(e.target.value)
                  setInputError(null)
                }}
                placeholder="421833"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="btn-csv w-full justify-center sm:w-auto" disabled={!isInternalUser}>
              Follow redirect
            </button>
            <button
              type="button"
              className="btn-csv w-full justify-center sm:w-auto"
              disabled={!isInternalUser}
              onClick={() => void runInspect()}
            >
              Inspect 302
            </button>
          </div>
        </form>

        {inputError && (
          <p className="mb-2 text-xs text-[var(--red)]" role="alert">
            {inputError}
          </p>
        )}
        <pre className="m-0 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border2)] bg-[var(--s2)] p-3 font-mono-dm text-[11px] leading-snug text-[var(--text2)]">
          {resultMessage}
        </pre>
      </div>
    </section>
  )
}
