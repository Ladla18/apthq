import { describe, expect, it } from 'vitest'
import {
  buildHealthV3ResponsePreview,
  healthV3AptdemoPath,
  healthV3FullUrl,
  parseHealthV3BrokerAggregate,
  parseHealthV3FetchResult,
  parseHealthV3Response,
  resolveHealthV3Brokers,
  resolveHealthV3FetchUrl,
  summarizeSection,
} from './healthCheckV3'
import type { HealthV3Response } from '../types/healthCheckV3'

const sampleResponse: HealthV3Response = {
  success: false,
  message: 'Position service is unhealthy',
  data: {
    status: 'not_ok',
    message: 'Position service is unhealthy',
    sections: {
      positions: {
        status: 'ok',
        message: 'Positions are healthy',
        details: { dbLength: 1 },
        errors: [],
      },
      strategies: {
        status: 'not_ok',
        message: 'Strategies are unhealthy',
        details: { dbLength: 1, missingEntityKeys: ['abc'] },
        errors: ['Redis key unavailable'],
      },
    },
  },
}

describe('healthCheckV3', () => {
  it('builds aptdemo path without broker for all', () => {
    expect(healthV3AptdemoPath('all')).toBe('/v3/healthCheck/position-service')
  })

  it('builds aptdemo path with broker query param', () => {
    expect(healthV3AptdemoPath('bajaj')).toBe(
      '/v3/healthCheck/position-service?broker=bajaj',
    )
  })

  it('builds full aptdemo URL for copy/paste', () => {
    expect(healthV3FullUrl('bajaj')).toBe(
      'https://api.webtest.apt.trading/v3/healthCheck/position-service?broker=bajaj',
    )
  })

  it('keeps absolute aptdemo URL for direct fetch', () => {
    expect(
      resolveHealthV3FetchUrl(
        'https://api.webtest.apt.trading/v3/healthCheck/position-service?broker=bajaj',
      ),
    ).toBe(
      'https://api.webtest.apt.trading/v3/healthCheck/position-service?broker=bajaj',
    )
  })

  it('resolves broker fan-out list', () => {
    expect(resolveHealthV3Brokers('all')).toHaveLength(6)
    expect(resolveHealthV3Brokers('bajaj')).toEqual(['bajaj'])
  })

  it('parses sections into rows with stats', () => {
    const stats = parseHealthV3Response(sampleResponse)
    expect(stats.total).toBe(2)
    expect(stats.ok).toBe(1)
    expect(stats.issues).toBe(1)
    expect(stats.rows[0].label).toBe('Positions')
    expect(stats.rows[1].chipLabel).toBe('NOT OK')
  })

  it('parses multi-broker aggregate response', () => {
    const aggregate = parseHealthV3BrokerAggregate({
      total: 2,
      brokers: {
        bajaj: sampleResponse,
        smc: { error: 'upstream failed', status_code: 502 },
      },
    })
    expect(aggregate.total).toBe(2)
    expect(aggregate.ok).toBe(0)
    expect(aggregate.issues).toBe(2)
    expect(aggregate.brokerRows[0].label).toBe('Bajaj Broking')
  })

  it('returns broker mode for all-brokers fetch result', () => {
    const view = parseHealthV3FetchResult('all', {
      total: 1,
      brokers: { bajaj: sampleResponse },
    })
    expect(view.mode).toBe('brokers')
    expect(view.brokerRows).toHaveLength(1)
  })

  it('returns section mode for single-broker fetch result', () => {
    const view = parseHealthV3FetchResult('bajaj', sampleResponse)
    expect(view.mode).toBe('sections')
    expect(view.rows).toHaveLength(2)
  })

  it('summarizes section details', () => {
    expect(
      summarizeSection({
        status: 'not_ok',
        message: 'x',
        details: { dbLength: 2, tradingDay: 'TUE' },
        errors: ['a', 'b'],
      }),
    ).toContain('dbLength: 2')
  })

  it('builds compact preview JSON for single broker', () => {
    const view = parseHealthV3FetchResult('smc', sampleResponse)
    expect(buildHealthV3ResponsePreview(view)).toEqual({
      success: false,
      message: 'Position service is unhealthy',
      data: {
        status: 'not_ok',
        message: 'Position service is unhealthy',
        sections: {
          positions: { status: 'ok', message: 'Positions are healthy' },
          strategies: { status: 'not_ok', message: 'Strategies are unhealthy' },
        },
      },
    })
  })

  it('builds compact preview JSON for all brokers', () => {
    const view = parseHealthV3FetchResult('all', {
      total: 1,
      brokers: { bajaj: sampleResponse },
    })
    expect(buildHealthV3ResponsePreview(view)).toEqual({
      success: false,
      message: '0/1 brokers healthy',
      status: 'not_ok',
      total: 1,
      brokers: {
        bajaj: {
          status: 'not_ok',
          message: 'Position service is unhealthy',
          sections: '1/2 ok',
        },
      },
    })
  })
})
