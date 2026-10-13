import type { BrokerKey } from '../types/dashboard'
import type {
  HealthV3BrokerRow,
  HealthV3Response,
  HealthV3Row,
  HealthV3Section,
  HealthV3Stats,
  HealthV3ViewModel,
} from '../types/healthCheckV3'
import { resolveHealthV3Brokers } from './aptdemoBrokers'
import { BROKER_NAMES } from './constants'

export { resolveHealthV3Brokers, HEALTH_V3_ALL_BROKERS } from './aptdemoBrokers'

export const HEALTH_V3_POSITION_SERVICE_PATH = '/v3/healthCheck/position-service'

export const HEALTH_V3_DEFAULT_ORIGIN = 'https://api.webtest.apt.trading'

export { DEFAULT_HEALTH_V3_BROKERS } from './aptdemoBrokers'

/** Direct aptdemo host. Empty env must not fall back to the Vercel origin. */
export const HEALTH_V3_API_BASE =
  import.meta.env.VITE_HEALTH_V3_API_BASE?.trim() || HEALTH_V3_DEFAULT_ORIGIN

export function healthV3AptdemoPath(broker: BrokerKey = 'all'): string {
  if (!broker || broker === 'all') return HEALTH_V3_POSITION_SERVICE_PATH
  const params = new URLSearchParams({ broker })
  return `${HEALTH_V3_POSITION_SERVICE_PATH}?${params.toString()}`
}

export function healthV3AptdemoUrl(broker: BrokerKey = 'all'): string {
  const base = HEALTH_V3_API_BASE.replace(/\/$/, '')
  const path = healthV3AptdemoPath(broker)
  return base ? `${base}${path}` : path
}

export function healthV3FullUrl(broker: BrokerKey = 'all'): string {
  return `${HEALTH_V3_DEFAULT_ORIGIN}${healthV3AptdemoPath(broker)}`
}

/** Keep fetches on the original aptdemo host, never the dashboard origin. */
export function resolveHealthV3FetchUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed

  if (trimmed.startsWith(HEALTH_V3_DEFAULT_ORIGIN)) {
    const path = trimmed.slice(HEALTH_V3_DEFAULT_ORIGIN.length)
    return healthV3AptdemoUrlFromPath(path || HEALTH_V3_POSITION_SERVICE_PATH)
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return healthV3AptdemoUrlFromPath(path)
}

function healthV3AptdemoUrlFromPath(path: string): string {
  const base = HEALTH_V3_API_BASE.replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

export const HEALTH_V3_SECTION_LABELS: Record<string, string> = {
  positions: 'Positions',
  strategies: 'Strategies',
  strategyBaskets: 'Strategy Baskets',
  openPositionTokens: 'Open Position Tokens',
}

function formatSectionLabel(key: string): string {
  return (
    HEALTH_V3_SECTION_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
  )
}

function chipForStatus(status: string): { cls: 'ok' | 'warn' | 'err'; label: string } {
  const normalized = status.toLowerCase()
  if (normalized === 'ok') return { cls: 'ok', label: 'OK' }
  if (normalized === 'not_ok' || normalized === 'not ok') {
    return { cls: 'warn', label: 'NOT OK' }
  }
  return { cls: 'err', label: status.toUpperCase() || 'ISSUE' }
}

export function summarizeSection(section: HealthV3Section): string {
  const parts: string[] = []
  const details = section.details ?? {}

  if (details.dbLength != null) parts.push(`dbLength: ${details.dbLength}`)
  if (details.checkedCount != null) parts.push(`checked: ${details.checkedCount}`)
  if (Array.isArray(details.missingEntityKeys) && details.missingEntityKeys.length) {
    parts.push(`missing keys: ${details.missingEntityKeys.length}`)
  }
  if (Array.isArray(section.errors) && section.errors.length) {
    parts.push(`errors: ${section.errors.length}`)
  }
  if (typeof details.redisKey === 'string') parts.push(`redis: ${details.redisKey}`)
  if (typeof details.tradingDay === 'string') parts.push(`day: ${details.tradingDay}`)

  return parts.join(' • ') || 'Response received'
}

function isHealthV3Response(value: unknown): value is HealthV3Response {
  if (!value || typeof value !== 'object') return false
  const record = value as HealthV3Response
  return typeof record.success === 'boolean' && record.data != null
}

function emptyStats(): HealthV3Stats {
  return {
    rows: [],
    total: 0,
    ok: 0,
    issues: 0,
    overallStatus: 'unknown',
    overallMessage: 'No data',
    apiSuccess: false,
  }
}

function brokerChipFromStats(stats: HealthV3Stats): {
  chipCls: 'ok' | 'warn' | 'err'
  chipLabel: string
} {
  const normalized = stats.overallStatus.toLowerCase()
  if (normalized === 'ok') return { chipCls: 'ok', chipLabel: 'OK' }
  if (normalized === 'not_ok' || normalized === 'not ok') {
    return { chipCls: 'warn', chipLabel: 'NOT OK' }
  }
  return { chipCls: 'err', chipLabel: stats.overallStatus.toUpperCase() || 'ISSUE' }
}

function brokerChipFromError(payload: Record<string, unknown>): {
  chipCls: 'ok' | 'warn' | 'err'
  chipLabel: string
  message: string
} {
  const statusCode = payload.status_code
  const label =
    statusCode != null ? `HTTP ${statusCode}` : payload.error ? 'Error' : 'Issue'
  const body = payload.body as { message?: string } | undefined
  const message = String(body?.message ?? payload.error ?? payload.message ?? 'Request failed')
  return { chipCls: 'err', chipLabel: String(label), message }
}

export function parseHealthV3Response(response: HealthV3Response): HealthV3Stats {
  const sections = response.data?.sections ?? {}
  const entries = Object.entries(sections)

  let ok = 0
  let issues = 0

  const rows: HealthV3Row[] = entries.map(([key, section]) => {
    const chip = chipForStatus(section.status)
    if (chip.cls === 'ok') ok += 1
    else issues += 1

    return {
      section: key,
      label: formatSectionLabel(key),
      status: section.status,
      message: section.message,
      detail: summarizeSection(section),
      chipCls: chip.cls,
      chipLabel: chip.label,
      payload: section,
    }
  })

  return {
    rows,
    total: rows.length,
    ok,
    issues,
    overallStatus: response.data?.status ?? 'unknown',
    overallMessage: response.data?.message || response.message,
    apiSuccess: response.success,
  }
}

export function parseHealthV3BrokerAggregate(
  response: {
    brokers?: Record<string, unknown>
    total?: number
  },
  brokerLabels: Record<string, string> = {},
): { brokerRows: HealthV3BrokerRow[]; total: number; ok: number; issues: number } {
  const entries = response.brokers ? Object.entries(response.brokers) : []
  let ok = 0
  let issues = 0

  const brokerRows = entries.map(([brokerKey, payload]) => {
    if (isHealthV3Response(payload)) {
      const stats = parseHealthV3Response(payload)
      const chip = brokerChipFromStats(stats)
      if (chip.chipCls === 'ok') ok += 1
      else issues += 1
      return {
        broker: brokerKey,
        label: brokerLabels[brokerKey] ?? BROKER_NAMES[brokerKey] ?? brokerKey,
        stats,
        chipCls: chip.chipCls,
        chipLabel: chip.chipLabel,
        payload,
      }
    }

    issues += 1
    const err = brokerChipFromError(
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {},
    )
    return {
      broker: brokerKey,
      label: brokerLabels[brokerKey] ?? BROKER_NAMES[brokerKey] ?? brokerKey,
      stats: {
        ...emptyStats(),
        overallMessage: err.message,
      },
      chipCls: err.chipCls,
      chipLabel: err.chipLabel,
      payload,
    }
  })

  return {
    brokerRows,
    total: Number(response.total) || brokerRows.length,
    ok,
    issues,
  }
}

/** Compact API-shaped JSON for the Health Check v3 preview box (not full section details). */
export function buildHealthV3ResponsePreview(
  view: HealthV3ViewModel,
): Record<string, unknown> {
  if (view.mode === 'brokers') {
    return {
      success: view.apiSuccess,
      message: view.overallMessage,
      status: view.overallStatus,
      total: view.total,
      brokers: Object.fromEntries(
        view.brokerRows.map((row) => [
          row.broker,
          {
            status: row.stats.overallStatus,
            message: row.stats.overallMessage,
            sections: `${row.stats.ok}/${row.stats.total} ok`,
          },
        ]),
      ),
    }
  }

  return {
    success: view.apiSuccess,
    message: view.overallMessage,
    data: {
      status: view.overallStatus,
      message: view.overallMessage,
      sections: Object.fromEntries(
        view.rows.map((row) => [
          row.section,
          { status: row.status, message: row.message },
        ]),
      ),
    },
  }
}

export function parseHealthV3FetchResult(
  broker: BrokerKey,
  body: unknown,
  brokerLabels: Record<string, string> = {},
): HealthV3ViewModel {
  if (
    broker === 'all' &&
    body &&
    typeof body === 'object' &&
    'brokers' in body &&
    (body as { brokers?: unknown }).brokers
  ) {
    const aggregate = parseHealthV3BrokerAggregate(
      body as { brokers?: Record<string, unknown>; total?: number },
      brokerLabels,
    )
    return {
      mode: 'brokers',
      broker,
      rows: [],
      brokerRows: aggregate.brokerRows,
      total: aggregate.total,
      ok: aggregate.ok,
      issues: aggregate.issues,
      overallStatus: aggregate.issues === 0 ? 'ok' : 'not_ok',
      overallMessage: `${aggregate.ok}/${aggregate.total} brokers healthy`,
      apiSuccess: aggregate.issues === 0,
    }
  }

  let responseBody = body
  if (
    broker !== 'all' &&
    body &&
    typeof body === 'object' &&
    'brokers' in body &&
    (body as { brokers?: Record<string, unknown> }).brokers
  ) {
    responseBody = (body as { brokers: Record<string, unknown> }).brokers[broker]
  }

  if (!isHealthV3Response(responseBody)) {
    const err = brokerChipFromError(
      responseBody && typeof responseBody === 'object'
        ? (responseBody as Record<string, unknown>)
        : { message: 'Invalid v3 health check response' },
    )
    return {
      mode: 'sections',
      broker,
      rows: [],
      brokerRows: [],
      total: 0,
      ok: 0,
      issues: 1,
      overallStatus: 'error',
      overallMessage: err.message,
      apiSuccess: false,
    }
  }

  const stats = parseHealthV3Response(responseBody)
  return {
    mode: 'sections',
    broker,
    rows: stats.rows,
    brokerRows: [],
    total: stats.total,
    ok: stats.ok,
    issues: stats.issues,
    overallStatus: stats.overallStatus,
    overallMessage: stats.overallMessage,
    apiSuccess: stats.apiSuccess,
  }
}

async function fetchHealthV3AptdemoBroker(
  broker: BrokerKey,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetch(healthV3AptdemoUrl(broker), {
    headers: { Accept: 'application/json' },
    signal,
  })

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = { message: res.statusText || 'Non-JSON response' }
  }

  if (!res.ok) {
    return {
      error: true,
      status_code: res.status,
      message:
        typeof body === 'object' &&
        body != null &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : res.statusText || 'Request failed',
      body,
    }
  }

  return body
}

export async function fetchHealthCheckV3AtUrl(
  url: string,
  broker: BrokerKey,
  signal?: AbortSignal,
): Promise<HealthV3ViewModel> {
  const trimmed = url.trim()
  if (!trimmed) throw new Error('URL is required')

  const res = await fetch(resolveHealthV3FetchUrl(trimmed), {
    headers: { Accept: 'application/json' },
    signal,
  })

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = { message: res.statusText || 'Non-JSON response' }
  }

  if (!res.ok) {
    throw new Error(
      typeof body === 'object' &&
        body != null &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `Health Check v3 failed (${res.status})`,
    )
  }

  return parseHealthV3FetchResult(broker, body)
}

export async function fetchHealthCheckV3PositionService(
  broker: BrokerKey,
  _availableBrokers: BrokerKey[],
  signal?: AbortSignal,
): Promise<HealthV3ViewModel> {
  if (broker === 'all') {
    const slugs = resolveHealthV3Brokers('all')
    if (!slugs.length) throw new Error('No brokers available to query.')

    const entries = await Promise.all(
      slugs.map(async (slug) => [slug, await fetchHealthV3AptdemoBroker(slug, signal)] as const),
    )

    return parseHealthV3FetchResult('all', {
      brokers: Object.fromEntries(entries),
      total: slugs.length,
    })
  }

  const body = await fetchHealthV3AptdemoBroker(broker, signal)
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    (body as { error?: unknown }).error
  ) {
    throw new Error(String((body as { message?: string }).message ?? 'Health Check v3 failed'))
  }

  return parseHealthV3FetchResult(broker, body)
}
