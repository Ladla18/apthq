import { useEffect, useMemo, useState } from 'react'
import {
  getPartnerTicketDetail,
  listPartnerTickets,
  replyToPartnerTicket,
} from '../../lib/chatTicketsApi'
import { useDashboard } from '../../context/DashboardContext'
import type {
  PartnerMessage,
  PartnerTicket,
  PartnerTicketDetailResponse,
  PartnerTicketListFilters,
} from '../../types/chatTickets'
import { Badge, Pill, SectionHeader } from '../ui/Shared'

const STATUS_OPTIONS = ['', 'open', 'pending', 'resolved', 'closed'] as const
const TYPE_OPTIONS = ['', 'support', 'technical', 'billing', 'other'] as const
const UNREAD_FOR_OPTIONS = ['', 'user', 'support', 'partner'] as const

function ticketId(ticket: PartnerTicket): string {
  const id = ticket._id ?? ticket.id
  return typeof id === 'string' ? id : ''
}

function formatWhen(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function messageId(msg: PartnerMessage, idx: number): string {
  const id = msg._id ?? msg.id
  return typeof id === 'string' ? id : `msg-${idx}`
}

export function ChatTicketsPanel() {
  const { brokerOptions, broker: activeBroker, dateRange } = useDashboard()
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [unreadFor, setUnreadFor] = useState('')
  const [startDate, setStartDate] = useState(dateRange.start)
  const [endDate, setEndDate] = useState(dateRange.end)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [tickets, setTickets] = useState<PartnerTicket[]>([])
  const [listMeta, setListMeta] = useState<{ total?: number; page?: number; limit?: number }>(
    {},
  )
  const [selectedTicket, setSelectedTicket] = useState<PartnerTicketDetailResponse | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])

  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submittingReply, setSubmittingReply] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const availableBrokers = useMemo(
    () =>
      brokerOptions
        .filter((option) => option.value !== 'all')
        .map((option) => ({
          id: option.value,
          label: option.label,
        })),
    [brokerOptions],
  )

  useEffect(() => {
    if (!availableBrokers.length) {
      setSelectedBrokers([])
      return
    }
    setSelectedBrokers((prev) => {
      const ids = new Set(availableBrokers.map((b) => b.id))
      const kept = prev.filter((id) => ids.has(id))
      if (kept.length) return kept
      if (activeBroker !== 'all' && ids.has(activeBroker)) return [activeBroker]
      return availableBrokers.map((b) => b.id)
    })
  }, [availableBrokers, activeBroker])

  const toggleBroker = (id: string) => {
    setSelectedBrokers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const fetchList = async () => {
    setError(null)
    setSuccess(null)
    if (!selectedBrokers.length) {
      setError('Provide at least one broker id.')
      return
    }
    const filters: PartnerTicketListFilters = {
      page,
      limit,
      status: status || undefined,
      type: type || undefined,
      unread_for: unreadFor || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }
    setLoadingList(true)
    try {
      const data = await listPartnerTickets(
        { user: 'partner', brokers: selectedBrokers },
        filters,
      )
      const rows = Array.isArray(data.tickets)
        ? data.tickets
        : Array.isArray(data.data)
          ? data.data
          : []
      setTickets(rows)
      setListMeta({ total: data.total, page: data.page, limit: data.limit })
      if (!rows.length) {
        setSelectedTicket(null)
        setSelectedTicketId('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoadingList(false)
    }
  }

  const openTicket = async (id: string) => {
    if (!id) return
    setError(null)
    setSuccess(null)
    setLoadingDetail(true)
    try {
      const detail = await getPartnerTicketDetail(id, {
        user: 'partner',
        brokers: selectedBrokers,
      })
      setSelectedTicket(detail)
      setSelectedTicketId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const sendReply = async () => {
    setError(null)
    setSuccess(null)
    if (!selectedTicketId) {
      setError('Open a ticket before sending a reply.')
      return
    }
    if (!selectedBrokers.length) {
      setError('Provide at least one broker id.')
      return
    }
    if (!replyContent.trim()) {
      setError('Reply content is required.')
      return
    }
    setSubmittingReply(true)
    try {
      await replyToPartnerTicket(selectedTicketId, {
        user: 'partner',
        brokers: selectedBrokers,
        content: replyContent.trim(),
        files: replyFiles,
      })
      setReplyContent('')
      setReplyFiles([])
      setSuccess('Reply sent successfully.')
      const fresh = await getPartnerTicketDetail(selectedTicketId, {
        user: 'partner',
        brokers: selectedBrokers,
      })
      setSelectedTicket(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSubmittingReply(false)
    }
  }

  return (
    <>
      <SectionHeader
        title="Partner Chat Tickets"
        titleColor="var(--purple)"
        badge={<Badge variant="strat">No auth · partner scope</Badge>}
      />

      <div className="mb-3 rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-[var(--s1)] p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
            Brokers from main API
          </div>
          <Pill variant="gray">
            Selected {selectedBrokers.length}/{availableBrokers.length}
          </Pill>
          <button
            type="button"
            className="act-btn"
            onClick={() => setSelectedBrokers(availableBrokers.map((b) => b.id))}
          >
            Select all
          </button>
          <button
            type="button"
            className="act-btn"
            onClick={() =>
              activeBroker !== 'all' ? setSelectedBrokers([activeBroker]) : undefined
            }
            disabled={activeBroker === 'all'}
          >
            Use active broker
          </button>
          <button
            type="button"
            className="act-btn"
            onClick={() => setSelectedBrokers([])}
          >
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableBrokers.map((broker) => {
            const active = selectedBrokers.includes(broker.id)
            return (
              <button
                key={broker.id}
                type="button"
                className={`dp ${active ? 'active' : ''}`}
                onClick={() => toggleBroker(broker.id)}
                title={broker.id}
              >
                {broker.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-4 grid gap-2.5 rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-[var(--text2)]">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || 'all'} value={option}>
                {option ? option : 'All statuses'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text2)]">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option || 'all'} value={option}>
                {option ? option : 'All types'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text2)]">
          Unread For
          <select
            value={unreadFor}
            onChange={(e) => setUnreadFor(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          >
            {UNREAD_FOR_OPTIONS.map((option) => (
              <option key={option || 'all'} value={option}>
                {option ? option : 'All unread states'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text2)]">
          Start Date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          />
        </label>
        <label className="text-xs text-[var(--text2)]">
          End Date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          />
        </label>
        <label className="text-xs text-[var(--text2)]">
          Page
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          />
        </label>
        <label className="text-xs text-[var(--text2)]">
          Limit
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 20))}
            className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 text-xs text-[var(--text)] outline-none"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-csv" onClick={fetchList} disabled={loadingList}>
          {loadingList ? 'Loading…' : 'Fetch Tickets'}
        </button>
        <button
          type="button"
          className="act-btn"
          onClick={() => {
            setStatus('')
            setType('')
            setUnreadFor('')
            setStartDate(dateRange.start)
            setEndDate(dateRange.end)
            setPage(1)
            setLimit(20)
          }}
        >
          Reset Filters
        </button>
        <Pill variant="gray">
          Loaded: {tickets.length}
          {typeof listMeta.total === 'number' ? ` / ${listMeta.total}` : ''}
        </Pill>
        {selectedTicketId && (
          <Pill variant="blue" mono>
            Active: {selectedTicketId}
          </Pill>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[var(--red-dim)] px-3 py-2 text-xs text-[var(--red)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-[var(--live-bd)] bg-[var(--live-dim)] px-3 py-2 text-xs text-[var(--live)]">
          {success}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-[var(--s1)]">
          <div className="table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Broker</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!tickets.length ? (
                  <tr>
                    <td colSpan={6} className="text-[var(--text3)]">
                      No tickets loaded yet.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t, idx) => {
                    const id = ticketId(t)
                    return (
                      <tr key={id || `ticket-${idx}`}>
                        <td className="font-mono-dm">{id || '—'}</td>
                        <td>{typeof t.broker === 'string' ? t.broker : '—'}</td>
                        <td>{typeof t.status === 'string' ? t.status : '—'}</td>
                        <td>{typeof t.type === 'string' ? t.type : '—'}</td>
                        <td>{formatWhen(t.updated_at ?? t.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="act-btn act-btn-primary"
                            onClick={() => openTicket(id)}
                            disabled={!id || loadingDetail}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-[var(--s1)] p-3.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
            Ticket Thread
          </div>
          {loadingDetail ? (
            <div className="text-xs text-[var(--text3)]">Loading ticket detail…</div>
          ) : !selectedTicket ? (
            <div className="text-xs text-[var(--text3)]">
              Open a ticket from the list to view messages and reply.
            </div>
          ) : (
            <>
              <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--s2)] p-2.5 text-xs">
                <div className="mb-1 text-[var(--text)]">
                  {String(
                    selectedTicket.ticket.subject ??
                      selectedTicket.ticket.title ??
                      selectedTicket.ticket._id ??
                      selectedTicket.ticket.id ??
                      'Untitled ticket',
                  )}
                </div>
                <div className="text-[var(--text2)]">
                  Broker: {String(selectedTicket.ticket.broker ?? '—')} · Status:{' '}
                  {String(selectedTicket.ticket.status ?? '—')}
                </div>
                <div className="mt-1 text-[var(--text3)]">
                  Last update: {formatWhen(selectedTicket.ticket.updated_at)}
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-auto pr-1">
                {selectedTicket.messages?.length ? (
                  selectedTicket.messages.map((msg, idx) => (
                    <div
                      key={messageId(msg, idx)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--s2)] p-2.5"
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text3)]">
                        {String(msg.role ?? msg.sender ?? 'message')} ·{' '}
                        {formatWhen(msg.created_at)}
                      </div>
                      <div className="text-xs text-[var(--text)]">{String(msg.content ?? '')}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[var(--text3)]">No messages.</div>
                )}
              </div>

              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a partner reply..."
                  className="h-24 w-full resize-y rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setReplyFiles(Array.from(e.target.files || []))}
                    className="text-xs text-[var(--text2)]"
                  />
                  <button
                    type="button"
                    className="act-btn act-btn-primary"
                    onClick={sendReply}
                    disabled={submittingReply}
                  >
                    {submittingReply ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
