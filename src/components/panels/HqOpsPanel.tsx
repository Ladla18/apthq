import { useMemo, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import {
  useInternalUserRedirect,
  useOrphanDiagnosis,
  useWebhookSignalsSearch,
} from '../../hooks/useHqOpsQueries'
import {
  flattenWebhookSignals,
  formatNrTimestamp,
  formatUtcToIst,
  orphanBrokerErrors,
  reasonLabel,
  signalStatusChipClass,
  successfulOrphanBrokers,
  toNaiveIstDatetime,
} from '../../lib/hqOps'
import type {
  NewRelicLog,
  OrphanChildBlock,
  OrphanDiagnosisBrokerPayload,
  OrphanParentBlock,
  PositionSnapshot,
  SignalSnapshot,
} from '../../types/hqOps'
import { SectionError } from '../ui/SectionState'
import { Badge, MetricCard, SectionHeader } from '../ui/Shared'
import { OpsDateInput, OpsTimeInput } from '../ui/OpsDateTimeInputs'

const inputClass =
  'h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none'

function defaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 1)
  const toDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return {
    startDate: toDate(start),
    endDate: toDate(end),
    startTime: '09:15',
    endTime: '15:30',
  }
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="m-0 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border2)] bg-[var(--s2)] p-3 font-mono-dm text-[11px] leading-snug text-[var(--text2)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function NewRelicLogsList({ logs }: { logs: NewRelicLog[] | undefined }) {
  if (!logs?.length) {
    return <p className="text-[11px] text-[var(--text3)]">No New Relic logs attached.</p>
  }
  return (
    <ul className="m-0 space-y-2 p-0 list-none">
      {logs.map((log, i) => (
        <li
          key={`${log.correlation_id || 'log'}-${log.timestamp ?? i}`}
          className="rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-3 py-2 text-[11px]"
        >
          <div className="mb-1 flex flex-wrap gap-2 text-[var(--text3)]">
            <span>{formatNrTimestamp(log.timestamp)}</span>
            {log.level && (
              <span className={`hc-chip ${log.level === 'error' ? 'err' : 'muted'}`}>
                {log.level}
              </span>
            )}
            {log.service && <span className="font-mono-dm">{log.service}</span>}
          </div>
          <div className="text-[var(--text2)]">{log.message || '—'}</div>
        </li>
      ))}
    </ul>
  )
}

function SignalMini({ label, signal }: { label: string; signal?: SignalSnapshot | null }) {
  if (!signal) {
    return (
      <div className="text-[11px] text-[var(--text3)]">
        {label}: —
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-[var(--border2)] bg-[var(--s2)] p-2.5 text-[11px]">
      <div className="mb-1 font-medium text-[var(--text2)]">{label}</div>
      <div className="flex flex-wrap gap-2 text-[var(--text3)]">
        <span className="font-mono-dm">{signal.id || '—'}</span>
        {signal.intent && <span>{signal.intent}</span>}
        {signal.status && (
          <span className={`hc-chip ${signalStatusChipClass(signal.status)}`}>
            {signal.status}
          </span>
        )}
      </div>
      {signal.new_relic_logs && signal.new_relic_logs.length > 0 && (
        <div className="mt-2">
          <NewRelicLogsList logs={signal.new_relic_logs} />
        </div>
      )}
    </div>
  )
}

function PositionExpand({
  position,
  kind,
}: {
  position: PositionSnapshot
  kind: 'parent' | 'child'
}) {
  return (
    <div className="space-y-2 p-2">
      {kind === 'parent' ? (
        <>
          <SignalMini label="Close signal" signal={position.close_signal} />
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Exit orders
            </div>
            <JsonBlock value={position.exit_orders ?? []} />
          </div>
        </>
      ) : (
        <>
          <SignalMini label="Entry signal" signal={position.entry_signal} />
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Exit signals
            </div>
            {(position.exit_signals || []).length === 0 ? (
              <p className="text-[11px] text-[var(--text3)]">None</p>
            ) : (
              (position.exit_signals || []).map((sig, i) => (
                <SignalMini key={sig.id || i} label={`Exit signal ${i + 1}`} signal={sig} />
              ))
            )}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Exit orders
            </div>
            <JsonBlock value={position.exit_orders ?? []} />
          </div>
        </>
      )}
    </div>
  )
}

function ParentCard({ parent }: { parent: OrphanParentBlock }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const strategy = parent.strategy
  const positions = parent.positions || []

  return (
    <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[var(--text)]">
          Parent · {strategy?.name || strategy?.id || '—'}
        </span>
        {strategy?.status && (
          <span className="hc-chip muted">{strategy.status}</span>
        )}
        {strategy?.broker && (
          <span className="font-mono-dm text-xs text-[var(--text3)]">{strategy.broker}</span>
        )}
      </div>
      {!positions.length ? (
        <p className="text-xs text-[var(--text3)]">No parent positions in diagnosis.</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--rlg)] border border-[var(--pur-bd)]">
          <div className="table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Type</th>
                  <th>Exit status</th>
                  <th>Closed (IST)</th>
                </tr>
              </thead>
              <tbody>
                {positions.flatMap((pos) => {
                  const key = pos.id || JSON.stringify(pos)
                  const isOpen = expanded[key]
                  return [
                    <tr
                      key={key}
                      className={`cursor-pointer ${isOpen ? 'expanded' : ''}`}
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [key]: !e[key] }))
                      }
                    >
                      <td className="font-mono-dm">
                        <span
                          className="mr-1.5 inline-block text-[10px] text-[var(--text3)]"
                          style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}
                        >
                          ▶
                        </span>
                        {pos.id || '—'}
                      </td>
                      <td>{pos.type || '—'}</td>
                      <td>{pos.exit_status || '—'}</td>
                      <td>{formatUtcToIst(pos.closed_at || pos.exit_time)}</td>
                    </tr>,
                    isOpen ? (
                      <tr key={`${key}-detail`}>
                        <td colSpan={4} className="!pb-3 !pt-0">
                          <PositionExpand position={pos} kind="parent" />
                        </td>
                      </tr>
                    ) : null,
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ChildBlock({ child }: { child: OrphanChildBlock }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const strategy = child.strategy
  const positions = child.positions || []

  return (
    <div className="rounded-[var(--rlg)] border border-[var(--border2)] bg-[var(--s1)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[var(--text)]">
          Child · {strategy?.name || strategy?.id || '—'}
        </span>
        {strategy?.status && (
          <span className="hc-chip muted">{strategy.status}</span>
        )}
      </div>
      <div className="overflow-hidden rounded-[var(--rlg)] border border-[var(--pur-bd)]">
        <div className="table-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Position</th>
                <th>Type</th>
                <th>Flags</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-[var(--text3)]">
                    No positions
                  </td>
                </tr>
              ) : (
                positions.flatMap((pos) => {
                  const key = pos.id || JSON.stringify(pos)
                  const isOpen = expanded[key]
                  return [
                    <tr
                      key={key}
                      className={`cursor-pointer ${isOpen ? 'expanded' : ''}`}
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [key]: !e[key] }))
                      }
                    >
                      <td className="font-mono-dm">
                        <span
                          className="mr-1.5 inline-block text-[10px] text-[var(--text3)]"
                          style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}
                        >
                          ▶
                        </span>
                        {pos.id || '—'}
                      </td>
                      <td>{pos.type || '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {pos.is_orphan && <span className="hc-chip err">orphan</span>}
                          {pos.is_unlinked_open && (
                            <span className="hc-chip warn">unlinked open</span>
                          )}
                          {!pos.is_orphan && !pos.is_unlinked_open && (
                            <span className="text-[var(--text3)]">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(pos.likely_reasons || []).map((r) => (
                            <span key={r} className="hc-chip muted">
                              {reasonLabel(r)}
                            </span>
                          ))}
                          {!(pos.likely_reasons || []).length && (
                            <span className="text-[var(--text3)]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>,
                    isOpen ? (
                      <tr key={`${key}-detail`}>
                        <td colSpan={4} className="!pb-3 !pt-0">
                          <PositionExpand position={pos} kind="child" />
                        </td>
                      </tr>
                    ) : null,
                  ]
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OrphanBrokerView({
  broker,
  payload,
}: {
  broker: string
  payload: OrphanDiagnosisBrokerPayload
}) {
  const summary = payload.summary
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--rlg)] border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.06)] p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono-dm text-sm font-semibold">{broker}</span>
          {payload.new_relic?.attached === false && payload.new_relic.reason && (
            <span className="text-[11px] text-[var(--text3)]">
              New Relic: {payload.new_relic.reason}
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <MetricCard
            variant="base"
            label="Orphan positions"
            value={String(summary?.orphan_position_count ?? 0)}
          />
          <MetricCard
            variant="base"
            label="Unlinked open"
            value={String(summary?.unlinked_open_count ?? 0)}
          />
          <MetricCard
            variant="base"
            label="Latest parent close (IST)"
            value={formatUtcToIst(summary?.latest_parent_closed_at)}
          />
        </div>
        {(summary?.likely_reasons || []).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(summary?.likely_reasons || []).map((r) => (
              <span key={r} className="hc-chip warn">
                {reasonLabel(r)}
              </span>
            ))}
          </div>
        )}
      </div>

      {payload.parent && <ParentCard parent={payload.parent} />}

      <div className="space-y-3">
        {(payload.children || []).map((child, i) => (
          <ChildBlock key={child.strategy?.id || i} child={child} />
        ))}
        {!(payload.children || []).length && (
          <p className="text-xs text-[var(--text3)]">No child strategies in diagnosis.</p>
        )}
      </div>
    </div>
  )
}

function InternalUserRedirectSection() {
  const { authEmail } = useDashboard()
  const mutation = useInternalUserRedirect()
  const [brokerName, setBrokerName] = useState('tradebulls')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const isInternalUser = authEmail?.toLowerCase().endsWith('@apt.trading') ?? false

  const runRedirect = () => {
    if (!isInternalUser) {
      setInputError('Only internal users can run selected-client redirect.')
      return
    }
    const broker = brokerName.trim().toLowerCase()
    if (!broker) {
      setInputError('Broker name is required.')
      return
    }
    if (!userId.trim()) {
      setInputError('User ID is required.')
      return
    }
    if (!password.trim()) {
      setInputError('Password is required.')
      return
    }
    if (!otp.trim()) {
      setInputError('OTP is required.')
      return
    }

    setInputError(null)
    setResultMessage(null)
    setRedirectUrl(null)

    mutation.mutate(
      {
        brokerName: broker,
        userId: userId.trim(),
        password,
        otp: otp.trim(),
      },
      {
        onSuccess: (data) => {
          setResultMessage(data.message || 'Client login succeeded.')
          setRedirectUrl(data.redirectUrl ?? null)
          if (data.redirectUrl) {
            window.location.assign(data.redirectUrl)
          }
        },
      },
    )
  }

  return (
    <div className="mb-6 rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-[18px]">
      <SectionHeader
        title="Internal user redirect"
        titleColor="var(--live)"
        badge={<Badge variant="live">Access</Badge>}
        lineColor="var(--live-bd)"
      />

      {!isInternalUser ? (
        <p className="text-xs text-[var(--amber)]">
          This action is restricted to internal users (`@apt.trading`).
        </p>
      ) : null}

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Broker name
          <input
            className={`${inputClass} mt-1 font-mono-dm`}
            value={brokerName}
            disabled={!isInternalUser}
            onChange={(e) => {
              setBrokerName(e.target.value)
              setInputError(null)
            }}
            placeholder="tradebulls"
          />
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Client user_id
          <input
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

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-xs text-[var(--text3)]">
          Calls <span className="font-mono-dm">/api/v1/active-users/selected-client/login</span>{' '}
          and redirects on success.
        </p>
        <button
          type="button"
          className="btn-csv w-full justify-center sm:w-auto"
          disabled={mutation.isPending || !isInternalUser}
          onClick={runRedirect}
        >
          {mutation.isPending ? 'Redirecting...' : 'Login & Redirect'}
        </button>
      </div>

      {inputError && (
        <p className="mb-2 text-xs text-[var(--red)]" role="alert">
          {inputError}
        </p>
      )}
      {mutation.isError && (
        <div className="mb-2">
          <SectionError message={mutation.error.message} onRetry={runRedirect} />
        </div>
      )}
      {resultMessage && !mutation.isError && (
        <p className="text-xs text-[var(--live)]" role="status">
          {resultMessage}
        </p>
      )}
      {redirectUrl && (
        <p className="mt-1 text-[11px] text-[var(--text3)] break-all">
          Redirect URL: <span className="font-mono-dm">{redirectUrl}</span>
        </p>
      )}
    </div>
  )
}

function WebhookSignalsSection() {
  const defaults = useMemo(() => defaultRange(), [])
  const [message, setMessage] = useState('')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [includeLogs, setIncludeLogs] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const mutation = useWebhookSignalsSearch()

  const flat = useMemo(
    () => (mutation.data ? flattenWebhookSignals(mutation.data) : null),
    [mutation.data],
  )

  const runSearch = () => {
    const msg = message.trim()
    if (msg.length < 3) {
      setInputError('Message must be at least 3 characters.')
      return
    }
    if (!startDate || !endDate) {
      setInputError('Start and end dates are required (IST).')
      return
    }
    setInputError(null)
    mutation.mutate({
      message: msg,
      startDatetime: toNaiveIstDatetime(startDate, startTime),
      endDatetime: toNaiveIstDatetime(endDate, endTime),
      includeLogs,
    })
  }

  return (
    <div className="mb-6 rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-[18px]">
      <SectionHeader
        title="Webhook signal search"
        titleColor="var(--purple)"
        badge={<Badge variant="strat">Ops</Badge>}
        lineColor="var(--pur-bd)"
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Message contains
          <input
            className={`${inputClass} mt-1 font-mono-dm`}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setInputError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runSearch()
              }
            }}
            placeholder="e.g. Market price unavailable"
          />
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Start (IST)
          <div className="mt-1 flex gap-2">
            <OpsDateInput
              aria-label="Start date"
              value={startDate}
              onChange={setStartDate}
            />
            <OpsTimeInput
              aria-label="Start time"
              value={startTime}
              onChange={setStartTime}
            />
          </div>
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          End (IST)
          <div className="mt-1 flex gap-2">
            <OpsDateInput
              aria-label="End date"
              value={endDate}
              onChange={setEndDate}
            />
            <OpsTimeInput
              aria-label="End time"
              value={endTime}
              onChange={setEndTime}
            />
          </div>
        </label>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
          <input
            type="checkbox"
            checked={includeLogs}
            onChange={(e) => setIncludeLogs(e.target.checked)}
          />
          Include New Relic logs
        </label>
        <button
          type="button"
          className="btn-csv w-full justify-center sm:w-auto"
          disabled={mutation.isPending}
          onClick={runSearch}
        >
          Search signals
        </button>
      </div>

      {inputError && (
        <p className="mb-2 text-xs text-[var(--red)]" role="alert">
          {inputError}
        </p>
      )}

      {mutation.isError && (
        <div className="mb-3">
          <SectionError
            message={mutation.error.message}
            onRetry={runSearch}
          />
        </div>
      )}

      {flat && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text2)]">
            <span>
              <strong className="text-[var(--text)]">{flat.total}</strong> matches found
              across {flat.brokerCount} brokers
            </span>
            {flat.newRelicNotice && (
              <span className="rounded-md border border-[var(--border2)] bg-[var(--s2)] px-2 py-1 text-[11px] text-[var(--text3)]">
                New Relic: {flat.newRelicNotice}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-[var(--rlg)] border border-[var(--pur-bd)]">
            <div className="table-scroll">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Time (IST)</th>
                    <th>Broker</th>
                    <th>Strategy</th>
                    <th>Intent</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Detailed message</th>
                    <th>Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {mutation.isPending ? (
                    <tr>
                      <td colSpan={8} className="text-[var(--text3)]">
                        Searching webhook signals across brokers...
                      </td>
                    </tr>
                  ) : flat.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-[var(--text3)]">
                        No matching signals.
                      </td>
                    </tr>
                  ) : (
                    flat.rows.flatMap((row) => {
                      const sig = row.signal
                      const key = `${row.broker}-${sig.id || sig.correlation_id || sig.created_at}`
                      const isOpen = expanded[key]
                      return [
                        <tr
                          key={key}
                          className={`cursor-pointer ${isOpen ? 'expanded' : ''}`}
                          onClick={() =>
                            setExpanded((e) => ({ ...e, [key]: !e[key] }))
                          }
                        >
                          <td>{formatUtcToIst(sig.created_at || sig.received_at)}</td>
                          <td className="font-mono-dm">{row.broker}</td>
                          <td>{sig.strategy_name || sig.strategy_id || '—'}</td>
                          <td>{sig.intent || '—'}</td>
                          <td>
                            <span className={`hc-chip ${signalStatusChipClass(sig.status)}`}>
                              {sig.status || '—'}
                            </span>
                          </td>
                          <td className="max-w-[220px] truncate text-[var(--text2)]">
                            {sig.message || sig.status_message || '—'}
                          </td>
                          <td
                            className="max-w-[360px] whitespace-normal text-[var(--text)]"
                            title={sig.detailed_message || undefined}
                          >
                            {sig.detailed_message || '—'}
                          </td>
                          <td className="font-mono-dm text-[11px]">
                            {sig.correlation_id || '—'}
                          </td>
                        </tr>,
                        isOpen ? (
                          <tr key={`${key}-detail`}>
                            <td colSpan={8} className="!pb-3 !pt-0">
                              {sig.detailed_message ? (
                                <div className="mb-3 rounded-md border border-[var(--border2)] bg-[var(--s2)] px-3 py-2 text-xs text-[var(--text)]">
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                                    Detailed message
                                  </div>
                                  {sig.detailed_message}
                                </div>
                              ) : null}
                              <div className="grid gap-3 lg:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                                    Payload
                                  </div>
                                  <JsonBlock value={sig.payload ?? null} />
                                </div>
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                                    New Relic logs
                                  </div>
                                  <NewRelicLogsList logs={sig.new_relic_logs} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null,
                      ]
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!flat && !mutation.isPending && !mutation.isError && (
        <p className="text-xs text-[var(--text3)]">
          Search by message text in an IST datetime range. Use include_logs only when you need
          New Relic detail.
        </p>
      )}
    </div>
  )
}

function OrphanDiagnosisSection() {
  const [strategyId, setStrategyId] = useState('')
  const [includeLogs, setIncludeLogs] = useState(true)
  const [inputError, setInputError] = useState<string | null>(null)

  const mutation = useOrphanDiagnosis()

  const successes = useMemo(
    () => (mutation.data ? successfulOrphanBrokers(mutation.data) : []),
    [mutation.data],
  )
  const errors = useMemo(
    () => (mutation.data ? orphanBrokerErrors(mutation.data) : []),
    [mutation.data],
  )

  const runDiagnose = () => {
    const id = strategyId.trim()
    if (id.length < 3) {
      setInputError('Strategy ID is required (at least a few characters).')
      return
    }
    setInputError(null)
    mutation.mutate({ strategyId: id, includeLogs })
  }

  return (
    <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-[18px]">
      <SectionHeader
        title="Orphan child diagnosis"
        titleColor="var(--amber)"
        badge={<Badge variant="live">Ops</Badge>}
        lineColor="var(--amber)"
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[280px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Parent strategy ID
          <input
            className={`${inputClass} mt-1 font-mono-dm`}
            value={strategyId}
            onChange={(e) => {
              setStrategyId(e.target.value)
              setInputError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runDiagnose()
              }
            }}
            placeholder="parent-strategy-id"
          />
        </label>
        <label className="flex h-8 items-center gap-2 text-xs text-[var(--text2)]">
          <input
            type="checkbox"
            checked={includeLogs}
            onChange={(e) => setIncludeLogs(e.target.checked)}
          />
          Include New Relic logs
        </label>
        <button
          type="button"
          className="btn-csv w-full justify-center sm:w-auto"
          disabled={mutation.isPending}
          onClick={runDiagnose}
        >
          Diagnose
        </button>
      </div>

      {inputError && (
        <p className="mb-2 text-xs text-[var(--red)]" role="alert">
          {inputError}
        </p>
      )}

      {mutation.isError && (
        <div className="mb-3">
          <SectionError message={mutation.error.message} onRetry={runDiagnose} />
        </div>
      )}

      {mutation.isPending && (
        <p className="text-xs text-[var(--text3)]">Running orphan diagnosis across brokers...</p>
      )}

      {mutation.data && !mutation.isPending && (
        <div className="space-y-4">
          <div className="grid-kpi-3">
            <MetricCard
              variant="base"
              label="Orphan positions (sum)"
              value={String(mutation.data.orphan_position_count ?? 0)}
            />
            <MetricCard
              variant="base"
              label="Brokers queried"
              value={String(mutation.data.broker_count ?? 0)}
            />
            <MetricCard
              variant="base"
              label="Brokers with match"
              value={String(successes.length)}
            />
          </div>

          {successes.map(({ broker, payload }) => (
            <OrphanBrokerView key={broker} broker={broker} payload={payload} />
          ))}

          {!successes.length && (
            <p className="text-xs text-[var(--text3)]">
              No broker returned a diagnosis for this strategy (often 404 elsewhere).
            </p>
          )}

          {errors.length > 0 && (
            <details className="rounded-lg border border-[var(--border2)] bg-[var(--s2)] p-3 text-xs">
              <summary className="cursor-pointer text-[var(--text2)]">
                Other brokers ({errors.length}) — no match / unreachable
              </summary>
              <ul className="mt-2 space-y-1 text-[var(--text3)]">
                {errors.map((e) => (
                  <li key={e.broker}>
                    <span className="font-mono-dm text-[var(--text2)]">{e.broker}</span>
                    : {e.detail}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!mutation.data && !mutation.isPending && !mutation.isError && (
        <p className="text-xs text-[var(--text3)]">
          Explains why child positions stayed open after a parent strategy closed. A strategy
          exists on one broker; others usually return 404.
        </p>
      )}
    </div>
  )
}

export function HqOpsPanel() {
  return (
    <section>
      <SectionHeader
        title="HQ Ops — Webhook signals & orphan diagnosis"
        titleColor="var(--purple)"
        badge={<Badge variant="strat">Fan-out</Badge>}
        lineColor="var(--pur-bd)"
      />
      <div className="mb-4 rounded-[var(--rlg)] border border-[var(--border2)] bg-[var(--s1)] p-3 text-xs leading-relaxed text-[var(--text2)]">
        Calls apt-hq-api once; responses are keyed by broker. Date inputs are IST (naive). Returned
        timestamps are UTC and shown in IST. Treat any broker object with{' '}
        <span className="font-mono-dm">error</span> as no match / unreachable.
      </div>
      <InternalUserRedirectSection />
      <WebhookSignalsSection />
      <OrphanDiagnosisSection />
    </section>
  )
}
