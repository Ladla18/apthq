import { useState, type FormEvent } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { Badge, SectionHeader } from '../ui/Shared'

const inputClass =
  'h-8 w-full rounded-lg border border-[var(--border2)] bg-[var(--s2)] px-2.5 text-xs text-[var(--text)] outline-none'

export function InternalUserRedirectPanel() {
  const { authEmail } = useDashboard()
  const [apiUrl, setApiUrl] = useState(
    'https://api.aptalgo.tradebulls.in/v2/active_users/selected_client/login',
  )
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState('Waiting.')
  const isInternalUser = authEmail?.toLowerCase().endsWith('@apt.trading') ?? false

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
            API URL
            <input
              className={`${inputClass} mt-1 font-mono-dm`}
              value={apiUrl}
              disabled={!isInternalUser}
              onChange={(e) => {
                setApiUrl(e.target.value)
                setInputError(null)
              }}
              placeholder="https://api.aptalgo.tradebulls.in/v2/active_users/selected_client/login"
            />
          </label>

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
