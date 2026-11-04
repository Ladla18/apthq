import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { useTheme } from '../../hooks/useTheme'
import type { PeriodPreset } from '../../types/dashboard'
import { LiveDot } from '../ui/Shared'
import { BrokerSelect } from '../ui/BrokerSelect'
import { DateRangePicker } from '../ui/DateRangePicker'

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'ytd', label: 'Year to date' },
]

export function PeriodFilters() {
  const {
    activePreset,
    setPeriodPreset,
    dateRange,
    setDateRange,
    clearPreset,
    exportCsv,
  } = useDashboard()

  return (
    <div className="mb-[22px] flex flex-wrap items-center gap-2">
      <span className="w-full text-[11px] font-semibold uppercase tracking-[0.7px] text-[var(--text3)] sm:w-auto">
        Period
      </span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`dp ${activePreset === p.id ? 'active' : ''}`}
          onClick={() => setPeriodPreset(p.id)}
        >
          {p.label}
        </button>
      ))}
      <DateRangePicker
        value={dateRange}
        onChange={(range) => {
          setDateRange(range)
          clearPreset()
        }}
      />
      <button type="button" className="btn-csv w-full justify-center sm:ml-auto sm:w-auto" onClick={exportCsv}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M6 1v6M3.5 5L6 7.5 8.5 5M2 9.5h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Export CSV
      </button>
    </div>
  )
}

export function TopNav() {
  const { broker, setBroker, brokerOptions, brokerColor, authEmail, logout } = useDashboard()
  const { isLight, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <nav className="sticky top-0 z-[200] flex h-[54px] items-center gap-2 border-b border-[var(--border)] bg-[var(--s1)] px-4 sm:gap-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
        <div className="logo-dot h-[7px] w-[7px] rounded-full bg-[var(--live)]" />
        Apt HQ
      </div>
      <div className="hidden h-5 w-px bg-[var(--border2)] sm:block" />
      <BrokerSelect
        value={broker}
        options={brokerOptions}
        onChange={setBroker}
        brokerColor={brokerColor}
      />
      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle light/dark mode"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border2)] bg-[var(--s2)] text-[var(--text2)] transition-all duration-150 hover:border-[var(--border3)] hover:bg-[var(--s3)] hover:text-[var(--text)]"
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
            style={{
              transform: isLight ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
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
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            className="flex cursor-pointer items-center border-none bg-transparent p-0"
            onClick={() => setMenuOpen((v) => !v)}
            title="Account"
          >
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--purple)] text-[11px] font-semibold tracking-wide text-white">
              AH
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[300] w-[220px] overflow-hidden rounded-[var(--rlg)] border border-[var(--border2)] bg-[var(--s1)]">
              <div className="flex items-center gap-2.5 px-3.5 pb-3 pt-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--purple)] text-[13px] font-semibold text-white">
                  AH
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[var(--text)]">Apt HQ Admin</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text3)]">
                    {authEmail || 'admin@apthq.io'}
                  </div>
                </div>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2.5 text-[13px] text-[var(--text2)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--red)]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                onClick={logout}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export function SubTabs() {
  const { activeTab, setActiveTab } = useDashboard()
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'tech', label: 'Tech & System' },
    { id: 'healthcheck', label: 'Health Check API' },
    { id: 'brandconfig', label: 'Brand Config' },
    { id: 'healthcheckv3', label: 'Health Check v3' },
    { id: 'debugstrategy', label: 'Debug Strategy' },
    { id: 'hqops', label: 'HQ Ops' },
    { id: 'chattickets', label: 'Chat Tickets' },
  ]

  const onKeyDown = (e: ReactKeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveTab(tabs[(index + 1) % tabs.length].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveTab(tabs[(index - 1 + tabs.length) % tabs.length].id)
    }
  }

  return (
    <div
      className="flex h-auto items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--s1)] px-4 sm:h-[42px] sm:gap-0.5 sm:px-6"
      role="tablist"
      aria-label="Dashboard sections"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => onKeyDown(e, index)}
          className={`flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md border-none px-3 text-[12px] font-medium transition-all duration-150 sm:text-[13px] ${
            activeTab === tab.id
              ? 'bg-[var(--pur-dim)] text-[var(--purple)]'
              : 'bg-transparent text-[var(--text2)] hover:bg-[var(--s2)] hover:text-[var(--text)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function FooterBar() {
  const { brokerLabel, footerStatus, footerHint } = useDashboard()

  const liveContent = () => {
    if (footerStatus === 'error') {
      return (
        <>
          <div className="ldot h-1.5 w-1.5 rounded-full bg-[var(--red)]" />
          API unavailable — {footerHint || 'Check API connection'}
        </>
      )
    }
    if (footerStatus === 'partial') {
      return (
        <>
          <div className="ldot h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
          Partial data loaded
        </>
      )
    }
    if (footerStatus === 'degraded') {
      return (
        <>
          <div className="ldot h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
          Some brokers degraded
        </>
      )
    }
    return (
      <>
        <LiveDot size={6} />
        Live data active
      </>
    )
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[100] flex min-h-9 flex-col items-start justify-center gap-1 border-t border-[var(--border)] bg-[var(--s1)] px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
      <span className="max-w-full truncate text-[11px] text-[var(--text3)]">{brokerLabel}</span>
      <span className="flex max-w-full items-center gap-1.5 text-[11px] text-[var(--live)]">
        {liveContent()}
      </span>
    </footer>
  )
}
