import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { requestOtp, verifyOtp } from '../lib/authApi'
import { useDashboardQueries } from '../hooks/useDashboardQueries'
import { setBrandConfigToken } from '../lib/brandConfigApi'
import { syncBrokersFromHealth } from '../lib/brokers'
import { BROKER_COLORS, BROKER_NAMES } from '../lib/constants'
import { defaultDateRange } from '../lib/dates'
import type {
  BrokerKey,
  DateRange,
  HealthData,
  LiveTradingData,
  MainActivity,
  PaperTradingData,
  StrategiesData,
  MainTab,
  PeriodPreset,
  UsersData,
} from '../types/dashboard'
import type { SectionSlice } from '../types/section'

export interface DashboardSections {
  mainActivity: SectionSlice<MainActivity>
  users: SectionSlice<UsersData>
  liveTrading: SectionSlice<LiveTradingData>
  paperTrading: SectionSlice<PaperTradingData>
  strategies: SectionSlice<StrategiesData>
  health: SectionSlice<HealthData | null>
}

interface DashboardContextValue {
  broker: BrokerKey
  setBroker: (broker: BrokerKey) => void
  brokerOptions: { value: BrokerKey; label: string }[]
  brokerLabel: string
  brokerColor: string
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  activePreset: PeriodPreset | null
  setPeriodPreset: (preset: PeriodPreset) => void
  clearPreset: () => void
  sections: DashboardSections
  loading: boolean
  apiError: string | null
  footerStatus: 'live' | 'partial' | 'degraded' | 'error'
  footerHint: string | null
  activeTab: MainTab
  setActiveTab: (tab: MainTab) => void
  reload: () => void
  exportCsv: () => void
  isAuthenticated: boolean
  authEmail: string | null
  requestLoginOtp: (email: string) => Promise<string | null>
  verifyLoginOtp: (email: string, code: string) => Promise<string | null>
  logout: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)
const AUTH_TOKEN_STORAGE_KEY = 'apthq-auth-token'
const AUTH_EMAIL_STORAGE_KEY = 'apthq-auth-email'

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [broker, setBrokerState] = useState<BrokerKey>('all')
  const [brokerOptions, setBrokerOptions] = useState([
    { value: 'all' as BrokerKey, label: BROKER_NAMES.all },
  ])
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [activePreset, setActivePreset] = useState<PeriodPreset | null>('30d')
  const [activeTab, setActiveTab] = useState<MainTab>('analytics')
  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() ?? '',
  )
  const [authEmail, setAuthEmail] = useState<string | null>(
    () => localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)?.trim() || null,
  )

  const analyticsEnabled = activeTab === 'analytics'

  const { sections, loading, partialErrors, allFailed, apiError, reload } =
    useDashboardQueries(broker, dateRange, {
      analyticsEnabled,
      healthEnabled: true,
    })

  useEffect(() => {
    const synced = syncBrokersFromHealth(sections.health.data, broker)
    setBrokerOptions((prev) => {
      const same =
        prev.length === synced.options.length &&
        prev.every(
          (opt, i) =>
            opt.value === synced.options[i]?.value &&
            opt.label === synced.options[i]?.label,
        )
      return same ? prev : synced.options
    })
    if (synced.broker !== broker) {
      setBrokerState(synced.broker)
    }
  }, [sections.health.data, broker])

  const setBroker = (next: BrokerKey) => setBrokerState(next)

  const setPeriodPreset = (preset: PeriodPreset) => {
    setActivePreset(preset)
    const end = new Date()
    const start = new Date()
    if (preset === '7d') start.setDate(end.getDate() - 7)
    else if (preset === '30d') start.setDate(end.getDate() - 30)
    else if (preset === '90d') start.setDate(end.getDate() - 90)
    else start.setMonth(0, 1)
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }

  const footerStatus = useMemo(() => {
    if (allFailed || apiError) return 'error' as const
    if (partialErrors.length) return 'partial' as const
    const unhealthy = Object.entries(sections.health.data?.brokers || {}).filter(
      ([, v]) => v !== 'ok' && v !== 'healthy',
    )
    if (unhealthy.length) return 'degraded' as const
    return 'live' as const
  }, [allFailed, apiError, partialErrors.length, sections.health.data])

  const exportCsv = () => {
    const u = sections.users.data || {}
    const l = sections.liveTrading.data || {}
    const p = sections.paperTrading.data || {}
    const st = sections.strategies.data || {}
    const label = BROKER_NAMES[broker] || broker
    const rows = [
      ['Metric', 'Value', 'Broker'],
      ['Total Users', u.total_registered_users ?? '', label],
      ['Live Orders', l.total_live_orders ?? '', label],
      ['Practice Orders', p.total_practice_orders ?? '', label],
      ['Strategies Created', st.total_strategies_created ?? '', label],
      ['Backtests', st.backtests_executed ?? '', label],
      ['Backtest Failures', st.backtest_failures ?? '', label],
    ]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], {
      type: 'text/csv',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'apt_hq.csv'
    a.click()
  }

  const requestLoginOtp = async (email: string): Promise<string | null> => {
    const { body } = await requestOtp(email)
    return typeof body.message === 'string' ? body.message : null
  }

  const verifyLoginOtp = async (email: string, code: string): Promise<string | null> => {
    const { body } = await verifyOtp(email, code)
    const token =
      (typeof body.token === 'string' && body.token.trim()) ||
      (typeof body.accessToken === 'string' && body.accessToken.trim()) ||
      (typeof body.access_token === 'string' && body.access_token.trim()) ||
      ''

    localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email.trim())
    setAuthEmail(email.trim())

    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
      setAuthToken(token)
      setBrandConfigToken(token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      setAuthToken('__verified__')
    }

    return typeof body.message === 'string' ? body.message : null
  }

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY)
    setBrandConfigToken('')
    setAuthToken('')
    setAuthEmail(null)
  }

  const value: DashboardContextValue = {
    broker,
    setBroker,
    brokerOptions,
    brokerLabel: BROKER_NAMES[broker] || broker,
    brokerColor: BROKER_COLORS[broker] || BROKER_COLORS.all,
    dateRange,
    setDateRange,
    activePreset,
    setPeriodPreset,
    clearPreset: () => setActivePreset(null),
    sections,
    loading,
    apiError,
    footerStatus,
    footerHint: apiError,
    activeTab,
    setActiveTab,
    reload,
    exportCsv,
    isAuthenticated: Boolean(authToken),
    authEmail,
    requestLoginOtp,
    verifyLoginOtp,
    logout,
  }

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
