import { describe, expect, it } from 'vitest'
import { extractTokenFromLogin } from './authApi'
import { requestOtpUrl, userLoginUrl, verifyOtpUrl } from './endpoints'

describe('authApi', () => {
  it('builds user login url with userId and optional from query', () => {
    expect(userLoginUrl('12345')).toBe('/v2/users/login?userId=12345')
    expect(userLoginUrl('12345', 'main')).toBe('/v2/users/login?userId=12345&from=main')
  })

  it('builds otp auth urls', () => {
    expect(requestOtpUrl()).toBe('/api/v1/auth/request-otp')
    expect(verifyOtpUrl()).toBe('/api/v1/auth/verify-otp')
  })

  it('extracts token from root level token property', () => {
    expect(extractTokenFromLogin({ token: 'jwt-123' })).toBe('jwt-123')
    expect(extractTokenFromLogin({ accessToken: 'jwt-456' })).toBe('jwt-456')
    expect(extractTokenFromLogin({ access_token: 'jwt-789' })).toBe('jwt-789')
  })

  it('extracts token from data object property', () => {
    expect(extractTokenFromLogin({ data: { token: 'nested-jwt' } })).toBe('nested-jwt')
    expect(extractTokenFromLogin({ data: { accessToken: 'nested-access' } })).toBe('nested-access')
    expect(extractTokenFromLogin({ data: { access_token: 'nested-access-2' } })).toBe('nested-access-2')
  })

  it('extracts token if data is raw token string', () => {
    expect(extractTokenFromLogin({ data: 'eyJhbGciOiJIUzI1Ni...' })).toBe('eyJhbGciOiJIUzI1Ni...')
  })

  it('returns null if no token is found', () => {
    expect(extractTokenFromLogin({})).toBeNull()
    expect(extractTokenFromLogin({ message: 'Success but no token' })).toBeNull()
  })
})
