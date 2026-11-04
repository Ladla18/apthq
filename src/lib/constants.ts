import type { BrokerKey, ServerRow, TokenRow } from '../types/dashboard'

export const DEFAULT_API_PROXY_TARGET =
  'https://zq64cz3rlu4mddosjkdnqvto2e0evpei.lambda-url.ap-south-1.on.aws'

/** Client-side API base. Defaults to direct upstream API host (no proxy). */
export const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() || DEFAULT_API_PROXY_TARGET

/** OTP auth API base used for request-otp / verify-otp flow. */
export const AUTH_API_BASE =
  import.meta.env.DEV
    ? ''
    : import.meta.env.VITE_AUTH_API_BASE?.trim() || API_BASE

export const BROKER_NAMES: Record<BrokerKey, string> = {
  all: 'All Brokers',
  tradesmart: 'TradeSmart',
  smc: 'SMC',
  navia: 'Navia',
  bajaj: 'Bajaj Broking',
  bajaj_trial: 'Bajaj Broking',
  tradesbull: 'Tradesbull',
  moneysukh: 'Moneysukh',
}

export const BROKER_COLORS: Record<BrokerKey, string> = {
  all: '#22c55e',
  tradesmart: '#8b5cf6',
  smc: '#3b82f6',
  navia: '#f59e0b',
  bajaj: '#ef4444',
  bajaj_trial: '#ef4444',
  tradesbull: '#10b981',
  moneysukh: '#06b6d4',
}

export const TOKENS: TokenRow[] = [
  { id: 'CLT-001', broker: 'TradeSmart', status: 'in', session: '21/04/26, 9:02 am' },
  { id: 'CLT-002', broker: 'TradeSmart', status: 'in', session: '21/04/26, 9:05 am' },
  { id: 'CLT-003', broker: 'SMC', status: 'out', session: '20/04/26, 9:01 am' },
  { id: 'CLT-004', broker: 'SMC', status: 'in', session: '21/04/26, 9:03 am' },
  { id: 'CLT-005', broker: 'Navia', status: 'in', session: '21/04/26, 9:10 am' },
  { id: 'CLT-006', broker: 'Navia', status: 'out', session: '19/04/26, 9:04 am' },
  { id: 'CLT-007', broker: 'Bajaj Broking', status: 'in', session: '21/04/26, 9:07 am' },
  { id: 'CLT-008', broker: 'Bajaj Broking', status: 'out', session: '20/04/26, 9:09 am' },
  { id: 'CLT-009', broker: 'TradeSmart', status: 'in', session: '21/04/26, 9:01 am' },
  { id: 'CLT-010', broker: 'SMC', status: 'in', session: '21/04/26, 9:06 am' },
]

export const SERVERS: ServerRow[] = [
  { name: 'apt-active-users', branch: 'main', commit: 'd73bcaa', deployed: '20/04/26, 2:58 pm', age: '1d ago', status: 'stale', broker: 'All brokers' },
  { name: 'service1-data-sync', branch: 'main', commit: '62f62f8', deployed: '17/04/26, 6:48 pm', age: '4d ago', status: 'stale', broker: 'All brokers' },
  { name: 'tusta-strategy-evaluator', branch: 'main', commit: '5868c2e', deployed: '17/04/26, 7:56 pm', age: '4d ago', status: 'stale', broker: 'All brokers' },
  { name: 'order-execution-engine', branch: 'main', commit: 'a1b2c3d', deployed: '21/04/26, 9:00 am', age: '6h ago', status: 'fresh', broker: 'All brokers' },
  { name: 'broker-bridge-tradesmart', branch: 'main', commit: 'f4e5d6c', deployed: '21/04/26, 8:55 am', age: '6h ago', status: 'fresh', broker: 'TradeSmart' },
  { name: 'broker-bridge-smc', branch: 'main', commit: '7a8b9c0', deployed: '21/04/26, 8:57 am', age: '6h ago', status: 'fresh', broker: 'SMC' },
  { name: 'strategy-scheduler', branch: 'hotfix/timeout', commit: '3d4e5f6', deployed: '19/04/26, 3:00 pm', age: '2d ago', status: 'drift', broker: 'All brokers' },
  { name: 'pnl-calculator', branch: 'main', commit: '1c2d3e4', deployed: '18/04/26, 11:00 am', age: '3d ago', status: 'stale', broker: 'All brokers' },
  { name: 'market-data-feed', branch: 'dev', commit: '9f0a1b2', deployed: '16/04/26, 5:00 pm', age: '5d ago', status: 'drift', broker: 'All brokers' },
  { name: 'notification-service', branch: 'main', commit: 'b3c4d5e', deployed: '21/04/26, 7:30 am', age: '8h ago', status: 'fresh', broker: 'All brokers' },
  { name: 'auth-token-manager', branch: 'main', commit: '6e7f8a9', deployed: '20/04/26, 1:00 pm', age: '1d ago', status: 'stale', broker: 'All brokers' },
  { name: 'backtest-runner', branch: 'main', commit: 'c5d6e7f', deployed: '15/04/26, 9:00 am', age: '6d ago', status: 'stale', broker: 'All brokers' },
]

export const STRATEGY_CHANNEL_COLORS: Record<string, string> = {
  'Strategy Builder': '#8b5cf6',
  'TradingView Import': '#4ecdc4',
  'Quick Options': '#f59e0b',
  'AI Assist': '#a78bfa',
}
