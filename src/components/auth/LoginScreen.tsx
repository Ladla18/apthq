import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { useTheme } from '../../hooks/useTheme'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toLoginError(err: unknown, fallback: string): string {
  if (err instanceof TypeError || (err instanceof Error && err.message === 'Failed to fetch')) {
    return 'Couldn’t reach the login service. Make sure it is running, then try again.'
  }
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}

function ThemeToggle() {
  const { isLight, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border2)] bg-[var(--s1)] text-[var(--text2)] transition hover:border-[var(--border3)] hover:text-[var(--text)]"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {isLight ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </>
        )}
      </svg>
    </button>
  )
}

export function LoginScreen() {
  const { requestLoginOtp, verifyLoginOtp } = useDashboard()
  const emailId = useId()
  const codeId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (step === 'email') emailRef.current?.focus()
    else codeRef.current?.focus()
  }, [step])

  const sendCode = async () => {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid work email.')
      setMessage(null)
      return
    }

    setIsRequesting(true)
    setError(null)
    setMessage(null)
    try {
      const apiMessage = await requestLoginOtp(trimmed)
      setEmail(trimmed)
      setStep('code')
      setMessage(apiMessage || `Code sent to ${trimmed}.`)
    } catch (err) {
      setError(toLoginError(err, 'Could not send the code.'))
    } finally {
      setIsRequesting(false)
    }
  }

  const onRequestOtp = async (e: FormEvent) => {
    e.preventDefault()
    await sendCode()
  }

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedCode = code.trim()
    if (trimmedCode.length < 4) {
      setError('Enter the code from your email.')
      setMessage(null)
      return
    }

    setIsVerifying(true)
    setError(null)
    setMessage(null)
    try {
      const apiMessage = await verifyLoginOtp(email, trimmedCode)
      setMessage(apiMessage || 'Signed in.')
    } catch (err) {
      setError(toLoginError(err, 'That code did not work.'))
    } finally {
      setIsVerifying(false)
    }
  }

  const busy = isRequesting || isVerifying

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 420px at 50% -10%, rgba(139,92,246,0.22), transparent 70%)',
        }}
      />

      <header className="relative flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="logo-dot h-[7px] w-[7px] rounded-full bg-[var(--live)]" />
          Apt HQ
        </div>
        <ThemeToggle />
      </header>

      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4 pb-12">
        <section className="w-full max-w-[440px] rounded-[20px] border border-[var(--border2)] bg-[var(--s1)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--purple)]">
            Secure sign in
          </p>
          <h1 className="m-0 mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em]">
            {step === 'email' ? 'Welcome back' : 'Check your email'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text2)]">
            {step === 'email'
              ? 'Use your work email. We’ll send a one-time code — no password.'
              : `Enter the code we sent to ${email}.`}
          </p>

          <ol className="mt-5 grid grid-cols-2 gap-2" aria-label="Sign-in steps">
            <li
              className={`rounded-lg border px-3 py-2 text-xs ${
                step === 'email'
                  ? 'border-[var(--pur-bd)] bg-[var(--pur-dim)] text-[var(--text)]'
                  : 'border-[var(--border)] bg-[var(--s2)] text-[var(--text3)]'
              }`}
            >
              <span className="font-mono-dm text-[10px] uppercase tracking-[0.6px]">Step 1</span>
              <div className="mt-0.5 font-medium">Email</div>
            </li>
            <li
              className={`rounded-lg border px-3 py-2 text-xs ${
                step === 'code'
                  ? 'border-[var(--pur-bd)] bg-[var(--pur-dim)] text-[var(--text)]'
                  : 'border-[var(--border)] bg-[var(--s2)] text-[var(--text3)]'
              }`}
            >
              <span className="font-mono-dm text-[10px] uppercase tracking-[0.6px]">Step 2</span>
              <div className="mt-0.5 font-medium">Code</div>
            </li>
          </ol>

          {step === 'email' ? (
            <form className="mt-5" noValidate onSubmit={onRequestOtp}>
              <label htmlFor={emailId} className="mb-1.5 block text-xs font-medium text-[var(--text2)]">
                Work email
              </label>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                disabled={busy}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="you@apt.trading"
                aria-invalid={Boolean(error)}
                className="h-11 w-full rounded-xl border border-[var(--border2)] bg-[var(--s2)] px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text3)] focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--pur-bd)] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border-none bg-[var(--purple)] text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--s3)] disabled:text-[var(--text3)]"
              >
                {isRequesting ? 'Sending code…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form className="mt-5" noValidate onSubmit={onVerifyOtp}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor={codeId} className="text-xs font-medium text-[var(--text2)]">
                  One-time code
                </label>
                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-[var(--purple)] hover:underline"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                    setError(null)
                    setMessage(null)
                  }}
                >
                  Change email
                </button>
              </div>
              <input
                ref={codeRef}
                id={codeId}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                disabled={busy}
                maxLength={8}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
                  if (error) setError(null)
                }}
                placeholder="••••••"
                aria-invalid={Boolean(error)}
                className="h-14 w-full rounded-xl border border-[var(--border2)] bg-[var(--s2)] px-3 text-center font-mono-dm text-2xl tracking-[0.35em] text-[var(--text)] outline-none transition placeholder:tracking-[0.2em] placeholder:text-[var(--text3)] focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--pur-bd)] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || code.trim().length < 4}
                className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-none bg-[var(--purple)] text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--s3)] disabled:text-[var(--text3)]"
              >
                {isVerifying ? 'Checking code…' : 'Continue'}
              </button>
              <button
                type="button"
                disabled={isRequesting}
                onClick={() => void sendCode()}
                className="mt-3 w-full cursor-pointer border-none bg-transparent py-1 text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequesting ? 'Resending…' : 'Resend code'}
              </button>
            </form>
          )}

          {message ? (
            <p
              className="mt-4 rounded-xl border border-[var(--live-bd)] bg-[var(--live-dim)] px-3 py-2.5 text-xs leading-relaxed text-[var(--live)]"
              role="status"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              className="mt-4 rounded-xl border border-[rgba(239,68,68,0.28)] bg-[var(--red-dim)] px-3 py-2.5 text-xs leading-relaxed text-[var(--red)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
