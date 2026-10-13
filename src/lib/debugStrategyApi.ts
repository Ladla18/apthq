import { DEFAULT_API_PROXY_TARGET } from './constants'
import type { DebugStrategyFieldRow, DebugStrategyResult } from '../types/debugStrategy'

/** Apt HQ Lambda — same backend as Analytics / Health Check v1 */
export const DEBUG_STRATEGY_API_ORIGIN = DEFAULT_API_PROXY_TARGET

export const STRATEGY_DEBUG_PATH = '/api/v3/strategies'

const API_BASE = import.meta.env.VITE_API_BASE?.trim() ?? ''

export function debugStrategyPath(strategyId: string, sessionId: string): string {
  const sid = encodeURIComponent(strategyId.trim())
  const sess = encodeURIComponent(sessionId.trim())
  return `${STRATEGY_DEBUG_PATH}/${sid}/${sess}`
}

export function debugStrategyUrl(strategyId: string, sessionId: string): string {
  const base = API_BASE.replace(/\/$/, '')
  const path = debugStrategyPath(strategyId, sessionId)
  return base ? `${base}${path}` : path
}

export function debugStrategyFullUrl(strategyId: string, sessionId: string): string {
  return `${DEBUG_STRATEGY_API_ORIGIN}${debugStrategyPath(strategyId, sessionId)}`
}

/** aptdemo reference URL (same path shape, different host). */
export const DEBUG_STRATEGY_APTDEMO_ORIGIN = 'https://api.webtest.apt.trading'

export function debugStrategyAptdemoPath(strategyId: string, sessionId: string): string {
  const sid = encodeURIComponent(strategyId.trim())
  const sess = encodeURIComponent(sessionId.trim())
  return `/v3/strategies/${sid}/${sess}`
}

export function debugStrategyAptdemoFullUrl(strategyId: string, sessionId: string): string {
  return `${DEBUG_STRATEGY_APTDEMO_ORIGIN}${debugStrategyAptdemoPath(strategyId, sessionId)}`
}

const HEALTH_V3_API_BASE =
  import.meta.env.VITE_HEALTH_V3_API_BASE?.trim() || DEBUG_STRATEGY_APTDEMO_ORIGIN

/** Direct aptdemo URL. Empty env must not fall back to the Vercel origin. */
export function debugStrategyAptdemoUrl(strategyId: string, sessionId: string): string {
  const base = HEALTH_V3_API_BASE.replace(/\/$/, '')
  const path = debugStrategyAptdemoPath(strategyId, sessionId)
  return base ? `${base}${path}` : path
}

export function formatDebugJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function previewValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.length} items]`
  if (typeof value === 'object') return `{${Object.keys(value).length} keys}`
  return String(value)
}

export function flattenTopLevelFields(body: unknown): DebugStrategyFieldRow[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return []

  return Object.entries(body as Record<string, unknown>).map(([key, value]) => {
    const isJson = value !== null && typeof value === 'object'
    return {
      key,
      value: previewValue(value),
      isJson,
      payload: value,
    }
  })
}

export function summarizeDebugResult(result: DebugStrategyResult | null) {
  if (!result) {
    return { status: '—', message: '—', requestId: '—', hasStrategyData: false }
  }

  const body =
    result.body && typeof result.body === 'object' && !Array.isArray(result.body)
      ? (result.body as Record<string, unknown>)
      : {}

  const hasStrategyData =
    body.brokers != null ||
    (body.data != null && typeof body.data === 'object')

  const message =
    body.message ??
    body.detail ??
    (body.position_id ? `Lookup for ${body.position_id}` : null) ??
    (result.ok ? 'Success' : 'Request failed')

  return {
    status: result.ok ? 'OK' : `HTTP ${result.status}`,
    message: String(message),
    requestId: String(body.requestId ?? '—'),
    hasStrategyData,
  }
}

export function extractStrategyData(body: unknown): unknown | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  if (record.brokers != null) return record.brokers
  if (record.data != null) return record.data
  return null
}

export function isApiErrorBody(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const record = body as Record<string, unknown>
  if (typeof record.detail === 'string') return true
  if (typeof record.error === 'string') return true
  return record.error === true || record.success === false
}

export async function fetchDebugStrategy(
  strategyId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<DebugStrategyResult> {
  const trimmedStrategy = strategyId.trim()
  const trimmedSession = sessionId.trim()

  if (!trimmedStrategy) throw new Error('Strategy ID is required')
  if (!trimmedSession) throw new Error('Session UUID is required')

  const res = await fetch(debugStrategyUrl(trimmedStrategy, trimmedSession), {
    headers: { Accept: 'application/json' },
    signal,
  })

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = { message: res.statusText || 'Non-JSON response' }
  }

  return { ok: res.ok, status: res.status, body }
}

export async function fetchDebugStrategyAptdemo(
  strategyId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<DebugStrategyResult> {
  const trimmedStrategy = strategyId.trim()
  const trimmedSession = sessionId.trim()

  if (!trimmedStrategy) throw new Error('Strategy ID is required')
  if (!trimmedSession) throw new Error('Session UUID is required')

  const res = await fetch(debugStrategyAptdemoUrl(trimmedStrategy, trimmedSession), {
    headers: { Accept: 'application/json' },
    signal,
  })

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = { message: res.statusText || 'Non-JSON response' }
  }

  return { ok: res.ok, status: res.status, body }
}
