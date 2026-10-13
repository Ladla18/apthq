import { describe, expect, it } from 'vitest'
import { DEFAULT_API_PROXY_TARGET } from './constants'
import {
  DEBUG_STRATEGY_API_ORIGIN,
  debugStrategyAptdemoFullUrl,
  debugStrategyAptdemoUrl,
  debugStrategyFullUrl,
  debugStrategyPath,
  extractStrategyData,
  flattenTopLevelFields,
  isApiErrorBody,
  summarizeDebugResult,
} from './debugStrategyApi'

describe('debugStrategyApi', () => {
  it('uses Lambda as debug strategy origin', () => {
    expect(DEBUG_STRATEGY_API_ORIGIN).toBe(DEFAULT_API_PROXY_TARGET)
  })

  it('builds Lambda v3 strategy lookup path', () => {
    expect(debugStrategyPath('strategy-1', 'session-2')).toBe(
      '/api/v3/strategies/strategy-1/session-2',
    )
  })

  it('builds full Lambda URL for copy/paste', () => {
    expect(debugStrategyFullUrl('strategy-1', 'session-2')).toBe(
      `${DEFAULT_API_PROXY_TARGET}/api/v3/strategies/strategy-1/session-2`,
    )
  })

  it('builds full aptdemo URL for copy/paste', () => {
    expect(debugStrategyAptdemoFullUrl('strategy-1', 'session-2')).toBe(
      'https://api.webtest.apt.trading/v3/strategies/strategy-1/session-2',
    )
  })

  it('builds direct aptdemo fetch URL', () => {
    expect(debugStrategyAptdemoUrl('strategy-1', 'session-2')).toBe(
      'https://api.webtest.apt.trading/v3/strategies/strategy-1/session-2',
    )
  })

  it('summarizes strategy lookup result', () => {
    const summary = summarizeDebugResult({
      ok: true,
      status: 200,
      body: {
        position_id: 'strategy-1',
        brokers: { tradesmart: {} },
        total: 1,
      },
    })
    expect(summary.hasStrategyData).toBe(true)
    expect(summary.message).toContain('strategy-1')
  })

  it('extracts brokers from response', () => {
    expect(extractStrategyData({ brokers: { a: 1 } })).toEqual({ a: 1 })
  })

  it('detects api error bodies', () => {
    expect(isApiErrorBody({ detail: 'Not Found' })).toBe(true)
    expect(isApiErrorBody({ position_id: 'x', brokers: {} })).toBe(false)
  })

  it('flattens top-level response fields', () => {
    const rows = flattenTopLevelFields({
      position_id: '1',
      brokers: {},
      total: 3,
    })
    expect(rows).toHaveLength(3)
  })
})
