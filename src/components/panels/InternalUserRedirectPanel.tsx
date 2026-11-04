import { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { useInternalUserRedirect } from '../../hooks/useHqOpsQueries'
import { SectionError } from '../ui/SectionState'
import { Badge, SectionHeader } from '../ui/Shared'

const inputClass =
  'h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none'

export function InternalUserRedirectPanel() {
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
    <section>
      <SectionHeader
        title="Internal User Redirect"
        titleColor="var(--live)"
        badge={<Badge variant="live">Access</Badge>}
        lineColor="var(--live-bd)"
      />

      <div className="mb-4 rounded-[var(--rlg)] border border-[var(--border2)] bg-[var(--s1)] p-3 text-xs leading-relaxed text-[var(--text2)]">
        Login to selected client with broker + user credentials and redirect to the returned target URL.
      </div>

      <div className="rounded-[var(--rlg)] border border-[var(--border)] bg-[var(--s1)] p-[18px]">
        {!isInternalUser ? (
          <p className="mb-3 text-xs text-[var(--amber)]">
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
          <p className="mt-1 break-all text-[11px] text-[var(--text3)]">
            Redirect URL: <span className="font-mono-dm">{redirectUrl}</span>
          </p>
        )}
      </div>
    </section>
  )
}
