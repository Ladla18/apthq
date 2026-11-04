import { API_BASE, AUTH_API_BASE } from './constants'
import { requestOtpUrl, userLoginUrl, verifyOtpUrl } from './endpoints'
import {
  extractBrandConfigToken,
  parseSessionTokenFromSetCookie,
} from './brandConfigAuth'
import type { LoginResponse, OtpApiResponse } from '../types/auth'

export { extractBrandConfigToken, parseSessionTokenFromSetCookie } from './brandConfigAuth'

/**
 * Extracts access token from various API response shapes:
 * - { token: "..." }
 * - { accessToken: "..." }
 * - { access_token: "..." }
 * - { data: { token: "..." } }
 * - { data: { accessToken: "..." } }
 * - { data: "eyJhbGci..." }
 */
export function extractTokenFromLogin(res: LoginResponse): string | null {
  if (typeof res.data === 'string' && res.data.startsWith('ey')) {
    return res.data
  }
  if (res.token) return res.token
  if (res.accessToken) return res.accessToken
  if (res.access_token) return res.access_token

  if (res.data && typeof res.data === 'object') {
    const d = res.data as Record<string, unknown>
    if (typeof d.token === 'string') return d.token
    if (typeof d.accessToken === 'string') return d.accessToken
    if (typeof d.access_token === 'string') return d.access_token
  }

  return null
}

export interface LoginResult {
  body: LoginResponse
  sessionToken: string | null
}

export interface OtpRequestResult {
  body: OtpApiResponse
}

export interface OtpVerifyResult {
  body: OtpApiResponse
}

async function parseLoginError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string; detail?: string }
    return body.message || body.error || body.detail || `${res.status} ${res.statusText}`
  } catch {
    return `${res.status} ${res.statusText}`
  }
}

async function postAuthJson<TBody extends Record<string, unknown>, TResponse>(
  endpoint: string,
  body: TBody,
  signal?: AbortSignal,
): Promise<TResponse> {
  const res = await fetch(`${AUTH_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    throw new Error(await parseLoginError(res))
  }

  return (await res.json()) as TResponse
}

/**
 * Executes POST /v2/users/login?userId={userId} (or with &from=main)
 *
 * @param userId - The user ID to authenticate
 * @param from - Optional origin source e.g. "main"
 * @param signal - Optional AbortSignal
 */
export async function loginUser(
  userId: string,
  from?: string,
  signal?: AbortSignal,
): Promise<LoginResult> {
  const trimmed = userId.trim()
  if (!trimmed) {
    throw new Error('User ID is required for login')
  }

  const endpoint = userLoginUrl(trimmed, from?.trim() || undefined)
  const url = `${API_BASE}${endpoint}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal,
  })

  if (!res.ok) {
    throw new Error(await parseLoginError(res))
  }

  const body = (await res.json()) as LoginResponse
  const sessionToken =
    parseSessionTokenFromSetCookie(res.headers.get('set-cookie') ?? undefined) ??
    extractBrandConfigToken(body)

  return { body, sessionToken }
}

export async function requestOtp(email: string, signal?: AbortSignal): Promise<OtpRequestResult> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    throw new Error('Email is required to request OTP')
  }

  const body = await postAuthJson<{ email: string }, OtpApiResponse>(
    requestOtpUrl(),
    { email: trimmedEmail },
    signal,
  )
  return { body }
}

export async function verifyOtp(
  email: string,
  code: string,
  signal?: AbortSignal,
): Promise<OtpVerifyResult> {
  const trimmedEmail = email.trim()
  const trimmedCode = code.trim()
  if (!trimmedEmail) {
    throw new Error('Email is required to verify OTP')
  }
  if (!trimmedCode) {
    throw new Error('OTP code is required')
  }

  const body = await postAuthJson<{ email: string; code: string }, OtpApiResponse>(
    verifyOtpUrl(),
    { email: trimmedEmail, code: trimmedCode },
    signal,
  )
  return { body }
}
