export type BrokerKey = string

export type MainTab =
  | 'analytics'
  | 'tech'
  | 'healthcheck'
  | 'brandconfig'
  | 'healthcheckv3'
  | 'debugstrategy'
  | 'hqops'
  | 'chattickets'
export type TechTab = 'tokens' | 'servers'
export type PeriodPreset = '7d' | '30d' | '90d' | 'ytd'
export type ServerFilter = 'all' | 'stale' | 'drift'

export interface DateRange {
  start: string
  end: string
}

export interface SegmentRow {
  segment: string
  orders_count?: number
  turnover_cr?: number
}

export interface PeakHour {
  slot_start: string
  count?: number
}

export interface DauPoint {
  date: string
  value: number
}

export interface UserLife {
  avg_life_days?: number
  total_users?: number
  min_life_days?: number
  max_life_days?: number
}

export interface StrategyOrders {
  active?: number
  all?: number
  executed?: number
  failed?: number
}

export interface MainActivity {
  live_orders_today?: number
  active_live_traders?: number
  live_strategies_running?: number
  options_turnover_cr?: number
  profitable_users?: number
}

export interface UsersData {
  total_registered_users?: number
  currently_online?: number
  live_active_users?: number
  paper_trade_users?: number
  avg_daily_users?: number
  peak_daily_users?: number
  minimum_daily_users?: number
  profitable_users?: number
  loss_or_flat_users?: number
  average_user_life?: UserLife
  dau_trend?: DauPoint[]
}

export interface LiveTradingData {
  total_live_orders?: number
  unique_trading_users?: number
  avg_orders_per_user?: number
  strategies_with_orders?: number | StrategyOrders
  total_live_strategies?: number
  strategy_builder_running?: number
  quick_options_running?: number
  tradingview_running?: number
  segment_breakdown?: SegmentRow[]
  peak_hours?: PeakHour[]
}

export interface PaperTradingData {
  total_practice_orders?: number
  unique_practice_users?: number
  avg_orders_per_user?: number
  strategies_with_orders?: number | StrategyOrders
  strategies_with_practice_orders?: number | StrategyOrders
  total_practice_strategies?: number
  strategy_builder_active?: number
  quick_options_active?: number
  tradingview_active?: number
  segment_breakdown?: SegmentRow[]
  peak_hours?: PeakHour[]
}

export interface ChannelCount {
  channel: string
  strategies_count?: number
  count?: number
}

export interface StrategiesData {
  total_strategies_created?: number
  unique_strategy_creators?: number
  ai_assisted_strategies?: number
  manually_built_strategies?: number
  strategies_deleted?: number
  strategies_duplicated?: number
  marketplace_subscriptions?: number
  marketplace_unsubscribed?: number
  backtests_executed?: number
  backtest_failures?: number
  creation_by_channel?: ChannelCount[]
  monthly_trend?: Record<string, ChannelCount[]>
}

export interface HealthData {
  brokers?: Record<string, string>
}

export interface DashboardData {
  mainActivity: MainActivity | null
  users: UsersData | null
  liveTrading: LiveTradingData | null
  paperTrading: PaperTradingData | null
  strategies: StrategiesData | null
  health: HealthData | null
  errors: string[]
}

export interface TokenRow {
  id: string
  broker: string
  status: 'in' | 'out'
  session: string
}

export interface ServerRow {
  name: string
  branch: string
  commit: string
  deployed: string
  age: string
  status: 'fresh' | 'stale' | 'drift' | 'deploying'
  broker: string
}

export interface HealthSummary {
  cls: 'ok' | 'warn' | 'err'
  label: string
  msg: string
  detail: string
}

export interface HealthCheckResponse {
  total?: number
  brokers?: Record<string, unknown>
}

export interface HealthRow {
  broker: string
  summary: HealthSummary
  payload: unknown
}
