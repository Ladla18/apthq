/** Shared broker error envelope from HQ fan-out */
export interface BrokerErrorPayload {
  error: string
  status_code?: number
  body?: { detail?: string; message?: string; [key: string]: unknown }
}

export interface NewRelicMeta {
  attached: boolean
  reason: string | null
  account_ids?: number[]
  log_count?: number
}

export interface NewRelicLog {
  timestamp?: number
  message?: string
  level?: string
  service?: string
  hostname?: string | null
  trace_id?: string | null
  correlation_id?: string | null
  [key: string]: unknown
}

export interface TokenIndexProbe {
  field?: string
  found?: boolean
  valid?: boolean
}

export interface OrderPlacementData {
  status?: string
  message?: string
  credentials?: { found?: boolean; hasUrl?: boolean }
  tokenIndexProbes?: {
    cash?: TokenIndexProbe
    fut?: TokenIndexProbe
    opt?: TokenIndexProbe
  }
  failures?: string[]
}

export interface OrderPlacementBrokerPayload {
  success?: boolean
  message?: string
  data?: OrderPlacementData
  error?: string
  status_code?: number
  body?: unknown
}

export interface OrderPlacementHealthResponse {
  total?: number
  brokers?: Record<string, OrderPlacementBrokerPayload>
}

export type OrderPlacementUiStatus = 'ok' | 'not_ok' | 'unreachable'

export interface OrderPlacementCard {
  broker: string
  uiStatus: OrderPlacementUiStatus
  message: string
  failures: string[]
  probes: {
    cash: TokenIndexProbe | null
    fut: TokenIndexProbe | null
    opt: TokenIndexProbe | null
  }
  payload: OrderPlacementBrokerPayload
}

export interface WebhookSignal {
  id?: string
  user_id?: string
  strategy_id?: string
  strategy_name?: string
  intent?: string
  status?: string
  message?: string
  status_message?: string
  detailed_message?: string | null
  payload?: unknown
  mode?: string
  price?: number | null
  created_at?: string
  received_at?: string
  correlation_id?: string
  new_relic_logs?: NewRelicLog[]
  [key: string]: unknown
}

export interface WebhookSignalsBrokerPayload {
  message?: string
  start_datetime?: string
  end_datetime?: string
  total?: number
  returned?: number
  new_relic?: NewRelicMeta
  signals?: WebhookSignal[]
  error?: string
  status_code?: number
  body?: unknown
}

export interface WebhookSignalsResponse {
  message?: string
  start_datetime?: string
  end_datetime?: string
  total?: number
  broker_count?: number
  brokers?: Record<string, WebhookSignalsBrokerPayload>
}

export interface FlatWebhookSignalRow {
  broker: string
  signal: WebhookSignal
  newRelic: NewRelicMeta | null
}

export interface WebhookSignalsQuery {
  message: string
  startDatetime: string
  endDatetime: string
  includeLogs: boolean
}

export interface StrategySnapshot {
  id?: string
  name?: string
  user_id?: string
  status?: string
  status_message?: string | null
  type?: string
  broker?: string
  is_paper?: boolean
  is_parent?: boolean
  parent_strategy_id?: string | null
  pending_action_payload?: unknown
  is_parent_delete?: boolean
  is_deleted?: boolean
  created_at?: string
  [key: string]: unknown
}

export interface SignalSnapshot {
  id?: string
  intent?: string
  status?: string
  message?: string
  correlation_id?: string
  new_relic_logs?: NewRelicLog[]
  [key: string]: unknown
}

export interface PositionSnapshot {
  id?: string
  type?: string
  closed_at?: string | null
  exit_time?: string | null
  exit_status?: string | null
  close_signal?: SignalSnapshot | null
  exit_orders?: unknown[]
  is_orphan?: boolean
  is_unlinked_open?: boolean
  parent_position_id?: string | null
  parent_closed_at?: string | null
  parent_exit_status?: string | null
  likely_reasons?: string[]
  entry_signal?: SignalSnapshot | null
  exit_signals?: SignalSnapshot[]
  [key: string]: unknown
}

export interface OrphanChildBlock {
  strategy?: StrategySnapshot
  positions?: PositionSnapshot[]
}

export interface OrphanParentBlock {
  strategy?: StrategySnapshot
  positions?: PositionSnapshot[]
}

export interface OrphanSummary {
  parent_strategy_id?: string
  child_strategy_count?: number
  parent_closed_position_count?: number
  orphan_position_count?: number
  unlinked_open_count?: number
  latest_parent_closed_at?: string | null
  likely_reasons?: string[]
}

export interface OrphanDiagnosisBrokerPayload {
  parent?: OrphanParentBlock
  children?: OrphanChildBlock[]
  summary?: OrphanSummary
  new_relic?: NewRelicMeta
  error?: string
  status_code?: number
  body?: unknown
}

export interface OrphanDiagnosisResponse {
  strategy_id?: string
  orphan_position_count?: number
  broker_count?: number
  brokers?: Record<string, OrphanDiagnosisBrokerPayload>
}

export interface OrphanDiagnosisQuery {
  strategyId: string
  includeLogs: boolean
}

export interface InternalUserRedirectQuery {
  brokerName: string
  userId: string
  password: string
  otp: string
}

export interface InternalUserRedirectResponse {
  success?: boolean
  message?: string
  redirectUrl?: string | null
  raw?: unknown
}
