import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileIcon,
  Filter,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react'
import { useDashboard } from '../../context/DashboardContext'
import {
  getPartnerTicketDetail,
  listPartnerTickets,
  replyToPartnerTicket,
  updatePartnerTicketStatus,
} from '../../lib/chatTicketsApi'
import type {
  PartnerMessage,
  PartnerTicket,
  PartnerTicketDetailResponse,
  PartnerTicketListFilters,
} from '../../types/chatTickets'
import { Badge, Pill } from '../ui/Shared'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'support', label: 'Support' },
  { value: 'technical', label: 'Technical' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
] as const

const UNREAD_FOR_OPTIONS = [
  { value: '', label: 'All Unread States' },
  { value: 'user', label: 'Unread for User' },
  { value: 'support', label: 'Unread for Support' },
  { value: 'partner', label: 'Unread for Partner' },
] as const

const UPDATE_STATUS_OPTIONS = [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed',
] as const

function ticketId(ticket: PartnerTicket): string {
  const id = ticket._id ?? ticket.id ?? ticket.ticket_id ?? ticket.ticketId
  return typeof id === 'string' ? id : ''
}

function ticketNumber(ticket: PartnerTicket): string {
  const no = ticket.ticketNo ?? ticket.ticket_no
  return typeof no === 'string' && no.trim() ? no.trim() : ''
}

function ticketUserId(ticket: PartnerTicket): string {
  const raw =
    ticket.user_id ??
    ticket.userId ??
    ticket.client_id ??
    ticket.clientId ??
    ticket.created_by ??
    ticket.createdBy ??
    (ticket.user && typeof ticket.user === 'object'
      ? (ticket.user as Record<string, unknown>).id ||
        (ticket.user as Record<string, unknown>).userId
      : undefined)
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '—'
}

function ticketTitle(ticket: PartnerTicket): string {
  const title = ticket.subject ?? ticket.title ?? ticket.issue ?? ticket.query
  if (typeof title === 'string' && title.trim()) return title.trim()
  return 'Support Ticket'
}

function messageId(msg: PartnerMessage, idx: number): string {
  const id = msg._id ?? msg.id
  return typeof id === 'string' && id ? id : `msg-${idx}`
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url)
}

export type MessageSenderCategory = 'support' | 'bot' | 'user'

function getMessageSenderCategory(
  msg: PartnerMessage,
  ticketClientId?: string
): MessageSenderCategory {
  // 1. Direct senderType check (backend returns: 'bot' | 'user' | 'support')
  const direct = String(
    msg.senderType ??
      msg.sender_type ??
      msg.role ??
      msg.sender ??
      msg.user ??
      msg.senderRole ??
      msg.author_type ??
      msg.type ??
      ''
  )
    .toLowerCase()
    .trim()

  if (
    direct === 'support' ||
    direct === 'partner' ||
    direct === 'agent' ||
    direct === 'admin' ||
    direct === 'staff' ||
    direct === 'internal'
  ) {
    return 'support'
  }

  if (
    direct === 'bot' ||
    direct === 'system' ||
    direct === 'assistant' ||
    direct === 'ai'
  ) {
    return 'bot'
  }

  if (
    direct === 'user' ||
    direct === 'client' ||
    direct === 'customer'
  ) {
    return 'user'
  }

  // 2. Explicit boolean flags
  if (
    msg.is_support === true ||
    msg.is_partner === true ||
    msg.is_agent === true ||
    msg.is_admin === true ||
    msg.is_staff === true
  ) {
    return 'support'
  }
  if (msg.is_bot === true || msg.is_system === true) {
    return 'bot'
  }
  if (
    msg.is_user === true ||
    msg.is_client === true ||
    msg.is_customer === true
  ) {
    return 'user'
  }
  if (msg.is_user === false || msg.is_client === false) {
    return 'support'
  }

  // 3. Substring matching
  if (
    direct.includes('support') ||
    direct.includes('partner') ||
    direct.includes('agent') ||
    direct.includes('admin')
  ) {
    return 'support'
  }
  if (direct.includes('bot') || direct.includes('assistant')) {
    return 'bot'
  }

  // 4. Direction or user ID comparison
  const msgUid = String(msg.userId ?? msg.user_id ?? msg.senderId ?? msg.sender_id ?? '').trim()
  const clientUid = String(ticketClientId ?? '').trim()
  if (msgUid && clientUid && clientUid !== '—' && msgUid === clientUid) {
    return 'user'
  }

  if (msg.direction === 'outbound' || msg.direction === 'outgoing') {
    return 'support'
  }

  // If userId exists and is not null, it's typically the client
  if (msg.userId && !direct) {
    return 'user'
  }

  return 'user'
}

function extractMessageContent(msg: PartnerMessage): string {
  if (typeof msg.content === 'string') return msg.content
  if (typeof msg.text === 'string') return msg.text
  if (typeof msg.message === 'string') return msg.message
  if (typeof msg.body === 'string') return msg.body
  if (typeof msg.msg === 'string') return msg.msg
  if (msg.content && typeof msg.content === 'object') {
    const c = msg.content as Record<string, unknown>
    if (typeof c.text === 'string') return c.text
    if (typeof c.message === 'string') return c.message
    if (typeof c.content === 'string') return c.content
  }
  if (msg.payload && typeof msg.payload === 'object') {
    const p = msg.payload as Record<string, unknown>
    if (typeof p.text === 'string') return p.text
    if (typeof p.message === 'string') return p.message
  }
  return ''
}

function getMessageAttachments(msg: PartnerMessage) {
  const rawList: unknown[] = [
    ...(Array.isArray(msg.files) ? msg.files : []),
    ...(Array.isArray(msg.attachments) ? msg.attachments : []),
    ...(Array.isArray(msg.media) ? msg.media : []),
    ...(Array.isArray(msg.mediaUrls) ? msg.mediaUrls : []),
  ]
  if (msg.file && typeof msg.file === 'object') rawList.push(msg.file)
  if (typeof msg.image === 'string') rawList.push({ url: msg.image, name: 'Screenshot' })
  if (typeof msg.image_url === 'string') rawList.push({ url: msg.image_url, name: 'Screenshot' })
  if (typeof msg.url === 'string' && (msg.url.startsWith('http') || msg.url.startsWith('/'))) {
    rawList.push({ url: msg.url, name: 'Attachment' })
  }

  return rawList
    .map((item, i) => {
      if (typeof item === 'string') {
        const name = item.split('/').pop()?.split('?')[0] || `File-${i + 1}`
        return { name, url: item, isImage: isImageUrl(item) }
      }
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>
        const url = String(rec.url ?? rec.file_url ?? rec.src ?? '')
        const name = String(rec.name ?? rec.filename ?? rec.title ?? `Attachment-${i + 1}`)
        const type = String(rec.type ?? rec.mimetype ?? '')
        const isImage = type.startsWith('image/') || isImageUrl(url) || isImageUrl(name)
        return { name, url, isImage }
      }
      return null
    })
    .filter((f): f is { name: string; url: string; isImage: boolean } => Boolean(f && f.url))
}

function formatPrettyDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status?: string) {
  const s = String(status ?? '').toLowerCase().trim()
  switch (s) {
    case 'open':
      return {
        variant: 'green' as const,
        label: 'Open',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        dot: 'bg-emerald-400',
      }
    case 'in_progress':
      return {
        variant: 'blue' as const,
        label: 'In Progress',
        bg: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
        dot: 'bg-sky-400',
      }
    case 'pending':
      return {
        variant: 'amber' as const,
        label: 'Pending',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        dot: 'bg-amber-400',
      }
    case 'resolved':
      return {
        variant: 'green' as const,
        label: 'Resolved',
        bg: 'bg-teal-500/10 text-teal-400 border-teal-500/25',
        dot: 'bg-teal-400',
      }
    case 'closed':
      return {
        variant: 'gray' as const,
        label: 'Closed',
        bg: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
        dot: 'bg-slate-400',
      }
    default:
      return {
        variant: 'gray' as const,
        label: s || 'Unknown',
        bg: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
        dot: 'bg-slate-400',
      }
  }
}

export function ChatTicketsPanel() {
  const { brokerOptions, broker: activeBroker, dateRange } = useDashboard()
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [unreadFor, setUnreadFor] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState(dateRange.start)
  const [endDate, setEndDate] = useState(dateRange.end)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [tickets, setTickets] = useState<PartnerTicket[]>([])
  const [listMeta, setListMeta] = useState<{ total?: number; page?: number; limit?: number }>({})
  const [selectedTicket, setSelectedTicket] = useState<PartnerTicketDetailResponse | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [selectedTicketStatus, setSelectedTicketStatus] = useState('in_progress')
  const [rowStatusByTicket, setRowStatusByTicket] = useState<Record<string, string>>({})
  const [replyContent, setReplyContent] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])

  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingRowTicketId, setUpdatingRowTicketId] = useState<string | null>(null)
  const [submittingReply, setSubmittingReply] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  // Initialize selected brokers from active broker or all available
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (selectedTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedTicket?.messages?.length])

  const toggleBroker = (id: string) => {
    setSelectedBrokers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Calculate ticket overview counts
  const ticketStats = useMemo(() => {
    const counts = { total: tickets.length, open: 0, inProgress: 0, closed: 0 }
    tickets.forEach((ticket) => {
      const s = String(ticket.status ?? '').toLowerCase()
      if (s === 'open') counts.open += 1
      else if (s === 'in_progress') counts.inProgress += 1
      else if (s === 'closed' || s === 'resolved') counts.closed += 1
    })
    return counts
  }, [tickets])

  // Client-side quick filter for loaded tickets
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets
    const q = searchQuery.toLowerCase().trim()
    return tickets.filter((t) => {
      const id = ticketId(t).toLowerCase()
      const u = ticketUserId(t).toLowerCase()
      const title = ticketTitle(t).toLowerCase()
      const broker = String(t.broker ?? '').toLowerCase()
      const typeStr = String(t.type ?? '').toLowerCase()
      return (
        id.includes(q) ||
        u.includes(q) ||
        title.includes(q) ||
        broker.includes(q) ||
        typeStr.includes(q)
      )
    })
  }, [tickets, searchQuery])

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text)
    setCopiedId(label)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const fetchList = async (targetPage = page) => {
    setError(null)
    setSuccess(null)
    if (!selectedBrokers.length) {
      setError('Please select at least one broker from the scope above.')
      return
    }
    const filters: PartnerTicketListFilters = {
      page: targetPage,
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
      setRowStatusByTicket((prev) => {
        const next = { ...prev }
        rows.forEach((row) => {
          const id = ticketId(row)
          if (!id) return
          const statusValue = String(row.status ?? '').trim()
          next[id] = statusValue || next[id] || 'in_progress'
        })
        return next
      })
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
      const currentStatus =
        typeof detail.ticket.status === 'string' && detail.ticket.status.trim()
          ? detail.ticket.status
          : 'in_progress'
      setSelectedTicketStatus(currentStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const refreshSelectedTicket = async () => {
    if (!selectedTicketId) return
    setError(null)
    setLoadingDetail(true)
    try {
      const detail = await getPartnerTicketDetail(selectedTicketId, {
        user: 'partner',
        brokers: selectedBrokers,
      })
      setSelectedTicket(detail)
      const currentStatus =
        typeof detail.ticket.status === 'string' && detail.ticket.status.trim()
          ? detail.ticket.status
          : selectedTicketStatus
      setSelectedTicketStatus(currentStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh ticket detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const sendReply = async () => {
    setError(null)
    setSuccess(null)
    if (!selectedTicketId) {
      setError('Select a ticket before sending a reply.')
      return
    }
    if (!selectedBrokers.length) {
      setError('Select at least one broker in your scope.')
      return
    }
    if (!replyContent.trim()) {
      setError('Reply message content is required.')
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
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccess('Reply sent as Support.')
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

  const updateStatus = async () => {
    setError(null)
    setSuccess(null)
    if (!selectedTicketId) {
      setError('Select a ticket first.')
      return
    }
    if (!selectedBrokers.length) {
      setError('Provide at least one broker id.')
      return
    }
    if (!selectedTicketStatus.trim()) {
      setError('Select a valid status.')
      return
    }

    setUpdatingStatus(true)
    try {
      await updatePartnerTicketStatus(selectedTicketId, {
        user: 'partner',
        brokers: selectedBrokers,
        status: selectedTicketStatus,
      })
      setSuccess(`Ticket status updated to "${selectedTicketStatus}".`)
      // Optimistically update list
      setTickets((prev) =>
        prev.map((t) =>
          ticketId(t) === selectedTicketId ? { ...t, status: selectedTicketStatus } : t,
        ),
      )
      await Promise.all([fetchList(page), refreshSelectedTicket()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const updateRowStatus = async (id: string) => {
    const nextStatus = rowStatusByTicket[id]
    if (!id || !nextStatus?.trim()) {
      setError('Select a status before applying.')
      return
    }
    setError(null)
    setSuccess(null)
    setUpdatingRowTicketId(id)
    try {
      await updatePartnerTicketStatus(id, {
        user: 'partner',
        brokers: selectedBrokers,
        status: nextStatus,
      })
      setSuccess(`Ticket ${id} status updated to "${nextStatus}".`)
      // Optimistically update list
      setTickets((prev) =>
        prev.map((t) => (ticketId(t) === id ? { ...t, status: nextStatus } : t)),
      )
      if (id === selectedTicketId) {
        setSelectedTicketStatus(nextStatus)
        await refreshSelectedTicket()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update row status')
    } finally {
      setUpdatingRowTicketId(null)
    }
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) {
      setReplyFiles((prev) => [...prev, ...files])
    }
  }

  const removeFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleResetFilters = () => {
    setStatus('')
    setType('')
    setUnreadFor('')
    setSearchQuery('')
    setStartDate(dateRange.start)
    setEndDate(dateRange.end)
    setPage(1)
    setLimit(20)
  }

  return (
    <div className="space-y-4">
      {/* ── TOP HERO & CONTROLS ── */}
      <div className="flex flex-col justify-between gap-3 rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-gradient-to-r from-[rgba(139,92,246,0.08)] via-[var(--s1)] to-[var(--s1)] p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--purple)]/15 text-[var(--purple)]">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text)] sm:text-lg">
                Partner Chat & Support Desk
              </h1>
              <p className="text-xs text-[var(--text2)]">
                Direct broker ticket management, live multi-party threads, and support response hub
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="strat" className="px-2.5 py-1 text-[10px]">
            No Auth · user=partner
          </Badge>
          <button
            type="button"
            className="act-btn flex items-center gap-1.5"
            onClick={() => fetchList(page)}
            disabled={loadingList}
            title="Refresh tickets list"
          >
            <RefreshCw className={`h-3 w-3 ${loadingList ? 'animate-spin' : ''}`} />
            {loadingList ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="act-btn flex items-center gap-1.5"
            onClick={() => setShowFilters((v) => !v)}
            title="Toggle filter controls"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* ── METRIC STATS OVERVIEW ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`cursor-pointer rounded-[var(--r)] border p-3 text-left transition-all ${
            status === ''
              ? 'border-[var(--pur-bd)] bg-[var(--pur-dim)] ring-1 ring-[var(--purple)]/40'
              : 'border-[var(--border)] bg-[var(--s1)] hover:border-[var(--border2)]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            <span>Total Loaded</span>
            <MessageSquare className="h-3.5 w-3.5 text-[var(--text3)]" />
          </div>
          <div className="font-mono-dm mt-1.5 text-2xl font-semibold text-[var(--text)]">
            {ticketStats.total}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text3)]">All active tickets in scope</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus('open')}
          className={`cursor-pointer rounded-[var(--r)] border p-3 text-left transition-all ${
            status === 'open'
              ? 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/40'
              : 'border-[var(--border)] bg-[var(--s1)] hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <span>Open Tickets</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="font-mono-dm mt-1.5 text-2xl font-semibold text-emerald-400">
            {ticketStats.open}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text3)]">Awaiting triage & review</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus('in_progress')}
          className={`cursor-pointer rounded-[var(--r)] border p-3 text-left transition-all ${
            status === 'in_progress'
              ? 'border-sky-500/40 bg-sky-500/10 ring-1 ring-sky-500/40'
              : 'border-[var(--border)] bg-[var(--s1)] hover:border-sky-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            <span>In Progress</span>
            <span className="h-2 w-2 rounded-full bg-sky-400" />
          </div>
          <div className="font-mono-dm mt-1.5 text-2xl font-semibold text-sky-400">
            {ticketStats.inProgress}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text3)]">Under active investigation</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus('resolved')}
          className={`cursor-pointer rounded-[var(--r)] border p-3 text-left transition-all ${
            status === 'resolved' || status === 'closed'
              ? 'border-slate-500/40 bg-slate-500/10 ring-1 ring-slate-500/40'
              : 'border-[var(--border)] bg-[var(--s1)] hover:border-slate-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="font-mono-dm mt-1.5 text-2xl font-semibold text-slate-200">
            {ticketStats.closed}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text3)]">Completed cases</div>
        </button>
      </div>

      {/* ── BROKER SCOPE SELECTOR ── */}
      <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[var(--purple)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
              Authorized Partner Broker Scope
            </span>
            <Pill variant="gray">
              {selectedBrokers.length} of {availableBrokers.length} active
            </Pill>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="act-btn text-[10px]"
              onClick={() => setSelectedBrokers(availableBrokers.map((b) => b.id))}
            >
              Select All
            </button>
            <button
              type="button"
              className="act-btn text-[10px]"
              onClick={() =>
                activeBroker !== 'all' ? setSelectedBrokers([activeBroker]) : undefined
              }
              disabled={activeBroker === 'all'}
            >
              Active Broker Only
            </button>
            <button
              type="button"
              className="act-btn text-[10px]"
              onClick={() => setSelectedBrokers([])}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableBrokers.map((b) => {
            const isSelected = selectedBrokers.includes(b.id)
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBroker(b.id)}
                className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 ${
                  isSelected
                    ? 'border-[var(--pur-bd)] bg-[var(--pur-dim)] text-[var(--purple)] font-semibold shadow-xs'
                    : 'border-[var(--border2)] bg-[var(--s2)] text-[var(--text2)] hover:border-[var(--border3)] hover:text-[var(--text)]'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      {showFilters && (
        <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-3.5 transition-all">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-[var(--text3)]">
                Quick Search (ID, User, Subject)
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type="text"
                  placeholder="Filter loaded tickets…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] pl-8 pr-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text3)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text3)]">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unread For */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text3)]">Unread State</label>
              <select
                value={unreadFor}
                onChange={(e) => setUnreadFor(e.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
              >
                {UNREAD_FOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text3)]">Page Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
              >
                {[10, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num} tickets
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
                <Calendar className="h-3 w-3" />
                Date Range:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 rounded-md border border-[var(--border2)] bg-[var(--s2)] px-2 text-[11px] text-[var(--text)] outline-none"
              />
              <span className="text-[11px] text-[var(--text3)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 rounded-md border border-[var(--border2)] bg-[var(--s2)] px-2 text-[11px] text-[var(--text)] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="act-btn flex items-center gap-1 text-xs"
                onClick={handleResetFilters}
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </button>
              <button
                type="button"
                className="btn-csv flex items-center gap-1.5"
                onClick={() => fetchList(1)}
                disabled={loadingList}
              >
                <Filter className="h-3 w-3" />
                {loadingList ? 'Fetching…' : 'Apply & Fetch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess(null)} className="hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── MAIN SPLIT WORKSPACE: DIRECTORY & CONVERSATION DESK ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: TICKETS DIRECTORY (7 cols) */}
        <div className="flex flex-col rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-[var(--s1)] lg:col-span-7">
          {/* Table Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
                Ticket Directory
              </span>
              <Pill variant="gray">
                {filteredTickets.length}
                {filteredTickets.length !== tickets.length && ` of ${tickets.length}`}
              </Pill>
              {typeof listMeta.total === 'number' && (
                <span className="text-[11px] text-[var(--text3)]">
                  Total in server: {listMeta.total}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="act-btn flex items-center gap-1 text-[11px]"
                onClick={() => fetchList(page)}
                disabled={loadingList}
              >
                <RefreshCw className={`h-2.5 w-2.5 ${loadingList ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="table-scroll flex-1">
            <table className="dtable min-w-[720px]">
              <thead>
                <tr>
                  <th className="w-24">Ticket ID</th>
                  <th className="w-28">User ID</th>
                  <th className="w-24">Broker</th>
                  <th>Subject & Details</th>
                  <th className="w-24">Status</th>
                  <th className="w-24">Updated</th>
                  <th className="w-36">Update Status</th>
                  <th className="w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && !tickets.length ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text3)]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-[var(--purple)]" />
                        <span>Loading tickets from partner API…</span>
                      </div>
                    </td>
                  </tr>
                ) : !filteredTickets.length ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text3)]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MessageSquare className="h-7 w-7 opacity-30" />
                        <span className="font-medium text-[var(--text2)]">No tickets found</span>
                        <span className="max-w-xs text-[11px]">
                          {searchQuery
                            ? `No tickets match "${searchQuery}". Clear your search.`
                            : 'Adjust your broker scope or filter parameters, then click Fetch Tickets.'}
                        </span>
                        <button
                          type="button"
                          className="btn-csv mt-2"
                          onClick={() => fetchList(1)}
                        >
                          Fetch Tickets
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t, idx) => {
                    const id = ticketId(t)
                    const tNo = ticketNumber(t)
                    const uid = ticketUserId(t)
                    const title = ticketTitle(t)
                    const badge = getStatusBadge(t.status)
                    const rowStatus = rowStatusByTicket[id] || String(t.status ?? 'in_progress')
                    const isSelected = Boolean(id && id === selectedTicketId)

                    return (
                      <tr
                        key={id || `ticket-${idx}`}
                        className={`group transition-colors ${
                          isSelected
                            ? 'bg-[var(--pur-dim)] ring-1 ring-inset ring-[var(--purple)]/30'
                            : 'hover:bg-[var(--s2)]'
                        }`}
                      >
                        {/* Ticket ID */}
                        <td className="font-mono-dm text-xs">
                          {tNo && (
                            <span className="font-semibold text-[var(--purple)] block">
                              {tNo}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(id, `id-${id}`)}
                            title="Click to copy Ticket ID"
                            className="flex items-center gap-1 text-[var(--text)] hover:text-[var(--purple)]"
                          >
                            <span className={tNo ? 'text-[11px] text-[var(--text3)]' : ''}>
                              {id ? (id.length > 8 ? `${id.slice(0, 8)}…` : id) : '—'}
                            </span>
                            <Copy className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                          </button>
                          {copiedId === `id-${id}` && (
                            <span className="text-[9px] text-emerald-400">Copied!</span>
                          )}
                        </td>

                        {/* User ID */}
                        <td className="font-mono-dm text-xs">
                          <div className="flex items-center gap-1 text-[var(--text2)]">
                            <User className="h-3 w-3 shrink-0 opacity-60" />
                            <span
                              className="max-w-[90px] truncate"
                              title={uid}
                              onClick={() => copyToClipboard(uid, `uid-${id}`)}
                            >
                              {uid}
                            </span>
                          </div>
                          {copiedId === `uid-${id}` && (
                            <span className="text-[9px] text-emerald-400">Copied!</span>
                          )}
                        </td>

                        {/* Broker */}
                        <td>
                          <span className="inline-flex rounded bg-[var(--s3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text2)]">
                            {typeof t.broker === 'string' ? t.broker : '—'}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="max-w-[180px]">
                          <div
                            className="truncate text-xs font-medium text-[var(--text)]"
                            title={title}
                          >
                            {title}
                          </div>
                          {t.last_message && typeof t.last_message === 'string' && (
                            <div className="truncate text-[10px] text-[var(--text3)]">
                              {t.last_message}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Last Updated */}
                        <td className="text-[11px] text-[var(--text3)]">
                          {formatPrettyDate(t.updated_at ?? t.created_at)}
                        </td>

                        {/* Row Status Update */}
                        <td>
                          <div className="flex items-center gap-1">
                            <select
                              value={rowStatus}
                              onChange={(e) =>
                                setRowStatusByTicket((prev) => ({
                                  ...prev,
                                  [id]: e.target.value,
                                }))
                              }
                              className="h-6.5 w-[94px] rounded border border-[var(--border2)] bg-[var(--s2)] px-1.5 text-[10px] text-[var(--text)] outline-none"
                              disabled={!id}
                            >
                              {UPDATE_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="act-btn h-6.5 px-2 text-[10px]"
                              onClick={() => updateRowStatus(id)}
                              disabled={!id || updatingRowTicketId === id}
                              title="Update status for this ticket"
                            >
                              {updatingRowTicketId === id ? (
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                'Set'
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Action: Open */}
                        <td className="text-right">
                          <button
                            type="button"
                            className={`act-btn ${isSelected ? 'act-btn-primary' : ''}`}
                            onClick={() => openTicket(id)}
                            disabled={!id || loadingDetail}
                          >
                            {isSelected ? 'Active' : 'Open'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--text3)]">
            <div className="flex items-center gap-1.5">
              <span>Showing</span>
              <span className="font-mono-dm font-semibold text-[var(--text)]">
                {filteredTickets.length}
              </span>
              <span>tickets on page</span>
              <span className="font-mono-dm font-semibold text-[var(--text)]">{page}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="act-btn flex items-center gap-1 text-[11px]"
                onClick={() => {
                  const next = Math.max(1, page - 1)
                  setPage(next)
                  fetchList(next)
                }}
                disabled={page <= 1 || loadingList}
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </button>
              <button
                type="button"
                className="act-btn flex items-center gap-1 text-[11px]"
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  fetchList(next)
                }}
                disabled={tickets.length < limit || loadingList}
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CONVERSATION & REPLY DESK (5 cols) */}
        <div className="flex flex-col rounded-[var(--rlg)] border border-[var(--pur-bd)] bg-[var(--s1)] lg:col-span-5">
          {/* Desk Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[var(--purple)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
                Conversation Desk
              </span>
            </div>
            {selectedTicketId && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="act-btn flex items-center gap-1 text-[11px]"
                  onClick={refreshSelectedTicket}
                  disabled={loadingDetail}
                  title="Reload thread"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${loadingDetail ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            )}
          </div>

          {/* Desk Body */}
          {loadingDetail ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center text-xs text-[var(--text3)]">
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--purple)]" />
              <span>Loading conversation thread…</span>
            </div>
          ) : !selectedTicket ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--s2)] text-[var(--text3)]">
                <MessageSquare className="h-6 w-6 opacity-40" />
              </div>
              <div className="text-xs font-semibold text-[var(--text2)]">No Ticket Selected</div>
              <p className="max-w-[260px] text-[11px] leading-relaxed text-[var(--text3)]">
                Click <span className="font-semibold text-[var(--purple)]">Open</span> on any ticket
                in the directory to view message history, user profile, and send partner replies.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between">
              {/* Ticket Details Summary Bar */}
              <div className="border-b border-[var(--border)] bg-[var(--s2)]/40 p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ticketNumber(selectedTicket.ticket) && (
                      <span className="inline-flex items-center rounded-md bg-[var(--pur-dim)] px-2 py-0.5 text-xs font-bold text-[var(--purple)] border border-[var(--pur-bd)]">
                        {ticketNumber(selectedTicket.ticket)}
                      </span>
                    )}
                    <span className="font-mono-dm text-xs font-bold text-[var(--text)]">
                      {ticketId(selectedTicket.ticket)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(ticketId(selectedTicket.ticket), 'active-id')
                      }
                      title="Copy Ticket ID"
                      className="text-[var(--text3)] hover:text-[var(--text)]"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {copiedId === 'active-id' && (
                      <span className="text-[10px] text-emerald-400">Copied!</span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      getStatusBadge(selectedTicket.ticket.status).bg
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        getStatusBadge(selectedTicket.ticket.status).dot
                      }`}
                    />
                    {getStatusBadge(selectedTicket.ticket.status).label}
                  </span>
                </div>

                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {ticketTitle(selectedTicket.ticket)}
                </div>

                {/* Metadata Pills */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text3)]">
                  <div className="flex items-center gap-1 rounded bg-[var(--s2)] px-2 py-0.5 text-[var(--text2)]">
                    <User className="h-3 w-3" />
                    <span className="font-mono-dm font-medium">
                      {ticketUserId(selectedTicket.ticket)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-[var(--s2)] px-2 py-0.5 text-[var(--text2)]">
                    <Building2 className="h-3 w-3" />
                    <span>{selectedTicket.ticket.broker ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Updated {formatPrettyDate(selectedTicket.ticket.updated_at)}</span>
                  </div>
                </div>

                {/* Status Update Quick Toolbar */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border2)]/50 pt-2.5">
                  <span className="text-[11px] font-medium text-[var(--text3)]">Change Status:</span>
                  <select
                    value={selectedTicketStatus}
                    onChange={(e) => setSelectedTicketStatus(e.target.value)}
                    className="h-7 rounded-md border border-[var(--border2)] bg-[var(--s1)] px-2 text-[11px] text-[var(--text)] outline-none"
                  >
                    {UPDATE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="act-btn act-btn-primary flex h-7 items-center gap-1 text-[11px]"
                    onClick={updateStatus}
                    disabled={updatingStatus}
                  >
                    {updatingStatus && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                    {updatingStatus ? 'Updating…' : 'Update'}
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 space-y-3.5 overflow-y-auto p-4 min-h-[340px] max-h-[480px]">
                {selectedTicket.messages?.length ? (
                  selectedTicket.messages.map((msg, idx) => {
                    const senderCategory = getMessageSenderCategory(
                      msg,
                      ticketUserId(selectedTicket.ticket)
                    )
                    const isSupport = senderCategory === 'support'
                    const isBot = senderCategory === 'bot'
                    const content = extractMessageContent(msg)
                    const attachments = getMessageAttachments(msg)
                    const timestamp = formatPrettyDate(msg.created_at ?? msg.createdAt)
                    const clientId = ticketUserId(selectedTicket.ticket)
                    const userIdentifier = msg.userId || (clientId !== '—' ? clientId : undefined)

                    // 1. SUPPORT MESSAGE -> ALWAYS ON THE RIGHT SIDE
                    if (isSupport) {
                      return (
                        <div key={messageId(msg, idx)} className="flex justify-end w-full">
                          <div className="flex items-end gap-2 max-w-[85%] flex-row-reverse">
                            {/* Support Avatar */}
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white text-[10px] font-bold shadow-xs select-none"
                              title="Support Team"
                            >
                              PS
                            </div>

                            {/* Bubble & Metadata */}
                            <div className="flex flex-col items-end min-w-0">
                              <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-[var(--text3)]">
                                <span>{timestamp}</span>
                                <span>•</span>
                                <span className="font-semibold text-[var(--purple)]">Support</span>
                              </div>

                              <div className="rounded-2xl rounded-tr-xs bg-gradient-to-br from-violet-600 to-purple-600 px-4 py-2.5 text-xs text-white shadow-md leading-relaxed border border-violet-500/20">
                                {content && <div className="whitespace-pre-wrap break-words">{content}</div>}
                                {!content && !attachments.length && (
                                  <div className="italic text-white/70 text-[11px]">(Empty message)</div>
                                )}

                                {attachments.length > 0 && (
                                  <div className={`space-y-1.5 ${content ? 'mt-2.5 pt-2 border-t border-white/20' : ''}`}>
                                    {attachments.map((file, fIdx) =>
                                      file.isImage ? (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block overflow-hidden rounded-lg border border-white/25 bg-black/20 hover:opacity-90"
                                        >
                                          <img src={file.url} alt={file.name} className="max-h-48 w-full object-cover" />
                                        </a>
                                      ) : (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/25 transition-colors border border-white/20"
                                        >
                                          <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                          <span className="max-w-[160px] truncate font-medium">{file.name}</span>
                                          <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-80" />
                                        </a>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // 2. BOT / SYSTEM ASSISTANT -> LEFT SIDE
                    if (isBot) {
                      return (
                        <div key={messageId(msg, idx)} className="flex justify-start w-full">
                          <div className="flex items-end gap-2 max-w-[85%]">
                            {/* Bot Avatar */}
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold shadow-xs select-none border border-indigo-200 dark:border-indigo-800/40"
                              title="Automated Assistant"
                            >
                              <Bot className="h-3.5 w-3.5" />
                            </div>

                            {/* Bubble & Metadata */}
                            <div className="flex flex-col items-start min-w-0">
                              <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-[var(--text3)]">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  Assistant Bot
                                </span>
                                <span>•</span>
                                <span>{timestamp}</span>
                              </div>

                              <div className="rounded-2xl rounded-tl-xs border border-[var(--border2)] bg-[var(--s2)] px-4 py-2.5 text-xs text-[var(--text)] shadow-xs leading-relaxed">
                                {content && <div className="whitespace-pre-wrap break-words">{content}</div>}
                                {!content && !attachments.length && (
                                  <div className="italic text-[var(--text3)] text-[11px]">(Empty message)</div>
                                )}

                                {attachments.length > 0 && (
                                  <div className={`space-y-1.5 ${content ? 'mt-2.5 pt-2 border-t border-[var(--border)]' : ''}`}>
                                    {attachments.map((file, fIdx) =>
                                      file.isImage ? (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--s1)] hover:opacity-90"
                                        >
                                          <img src={file.url} alt={file.name} className="max-h-48 w-full object-cover" />
                                        </a>
                                      ) : (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-2 rounded-lg bg-[var(--s1)] px-2.5 py-1.5 text-[11px] text-[var(--purple)] hover:underline border border-[var(--border2)] transition-colors"
                                        >
                                          <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                          <span className="max-w-[160px] truncate font-medium">{file.name}</span>
                                          <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-70" />
                                        </a>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // 3. USER / CLIENT -> LEFT SIDE
                    return (
                      <div key={messageId(msg, idx)} className="flex justify-start w-full">
                        <div className="flex items-end gap-2 max-w-[85%]">
                          {/* Client Avatar */}
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-[10px] font-bold shadow-xs select-none"
                            title={`User (${userIdentifier || 'Client'})`}
                          >
                            <User className="h-3.5 w-3.5" />
                          </div>

                          {/* Bubble & Metadata */}
                          <div className="flex flex-col items-start min-w-0">
                            <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-[var(--text3)]">
                              <span className="font-semibold text-[var(--text)]">
                                {userIdentifier ? `Client #${userIdentifier}` : 'Client / User'}
                              </span>
                              <span>•</span>
                              <span>{timestamp}</span>
                            </div>

                            <div className="rounded-2xl rounded-tl-xs border border-[var(--border2)] bg-[var(--s2)] px-4 py-2.5 text-xs text-[var(--text)] shadow-xs leading-relaxed">
                              {content && <div className="whitespace-pre-wrap break-words">{content}</div>}
                              {!content && !attachments.length && (
                                <div className="italic text-[var(--text3)] text-[11px]">(Empty message)</div>
                              )}

                              {attachments.length > 0 && (
                                <div className={`space-y-1.5 ${content ? 'mt-2.5 pt-2 border-t border-[var(--border)]' : ''}`}>
                                  {attachments.map((file, fIdx) =>
                                    file.isImage ? (
                                      <a
                                        key={fIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--s1)] hover:opacity-90"
                                      >
                                        <img src={file.url} alt={file.name} className="max-h-48 w-full object-cover" />
                                      </a>
                                    ) : (
                                      <a
                                        key={fIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-[var(--s1)] px-2.5 py-1.5 text-[11px] text-[var(--purple)] hover:underline border border-[var(--border2)] transition-colors"
                                      >
                                        <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="max-w-[160px] truncate font-medium">{file.name}</span>
                                        <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-70" />
                                      </a>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--text3)]">
                    No conversation history recorded for this ticket.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Composer */}
              <div className="border-t border-[var(--border)] bg-[var(--s2)]/25 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text2)]">
                    <Send className="h-3 w-3 text-[var(--purple)]" />
                    <span>Reply as Support</span>
                    <span className="text-[10px] text-[var(--text3)]">(Visible to end user)</span>
                  </div>
                  <span className="text-[10px] text-[var(--text3)]">Ctrl + Enter to send</span>
                </div>

                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  placeholder="Type support response to user…"
                  className="h-20 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--s2)] p-2.5 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--purple)]"
                />

                {/* Selected File Chips Preview */}
                {replyFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {replyFiles.map((file, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border2)] bg-[var(--s1)] px-2 py-1 text-[11px] text-[var(--text2)]"
                      >
                        <FileIcon className="h-3 w-3 text-[var(--purple)]" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Composer Actions */}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={handleFileAttach}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="act-btn flex items-center gap-1.5 text-[11px]"
                    >
                      <Paperclip className="h-3 w-3" />
                      Attach file
                    </button>
                  </div>

                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--purple)] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={sendReply}
                    disabled={submittingReply || !replyContent.trim()}
                  >
                    <Send className={`h-3 w-3 ${submittingReply ? 'animate-pulse' : ''}`} />
                    {submittingReply ? 'Sending…' : 'Send Response'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
