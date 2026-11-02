import type {
  PartnerBody,
  PartnerTicketDetailResponse,
  PartnerTicketListFilters,
  PartnerTicketListResponse,
} from '../types/chatTickets'

const PARTNER_CHAT_API_BASE =
  import.meta.env.VITE_CHAT_API_BASE?.trim() || 'https://api.apt.trading'

function toQueryString(filters: PartnerTicketListFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '') return
    params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function toErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const message = record.message ?? record.detail ?? record.error ?? record.Message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return `Request failed (${status})`
}

export async function listPartnerTickets(
  body: PartnerBody,
  filters: PartnerTicketListFilters,
  signal?: AbortSignal,
): Promise<PartnerTicketListResponse> {
  const res = await fetch(
    `${PARTNER_CHAT_API_BASE}/api/partner/tickets${toQueryString(filters)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
  )

  const payload = await parseJsonSafe(res)
  if (!res.ok) throw new Error(toErrorMessage(res.status, payload))
  return (payload ?? {}) as PartnerTicketListResponse
}

export async function getPartnerTicketDetail(
  ticketId: string,
  body: PartnerBody,
  signal?: AbortSignal,
): Promise<PartnerTicketDetailResponse> {
  const res = await fetch(
    `${PARTNER_CHAT_API_BASE}/api/partner/tickets/${encodeURIComponent(ticketId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
  )
  const payload = await parseJsonSafe(res)
  if (!res.ok) throw new Error(toErrorMessage(res.status, payload))
  return payload as PartnerTicketDetailResponse
}

export async function replyToPartnerTicket(
  ticketId: string,
  body: PartnerBody & { content: string; files?: File[] },
): Promise<unknown> {
  const endpoint = `${PARTNER_CHAT_API_BASE}/api/partner/tickets/${encodeURIComponent(ticketId)}/messages`
  const hasFiles = Boolean(body.files?.length)

  const res = hasFiles
    ? await fetch(endpoint, {
        method: 'POST',
        body: buildReplyFormData(body),
      })
    : await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: body.user,
          brokers: body.brokers,
          content: body.content,
        }),
      })

  const payload = await parseJsonSafe(res)
  if (!res.ok) throw new Error(toErrorMessage(res.status, payload))
  return payload
}

export async function updatePartnerTicketStatus(
  ticketId: string,
  body: PartnerBody & { status: string },
): Promise<unknown> {
  const res = await fetch(
    `${PARTNER_CHAT_API_BASE}/api/partner/tickets/${encodeURIComponent(ticketId)}/status`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: body.user,
        brokers: body.brokers,
        status: body.status,
      }),
    },
  )

  const payload = await parseJsonSafe(res)
  if (!res.ok) throw new Error(toErrorMessage(res.status, payload))
  return payload
}

function buildReplyFormData(body: PartnerBody & { content: string; files?: File[] }): FormData {
  const form = new FormData()
  form.append('user', body.user)
  form.append('brokers', JSON.stringify(body.brokers))
  form.append('content', body.content)
  body.files?.forEach((file) => {
    form.append('files', file, file.name)
  })
  return form
}
