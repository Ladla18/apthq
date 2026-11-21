export interface QuickLogin {
  userId: string
  password: string
  totpSecret: string
}

function login(userId?: string, password?: string, totpSecret?: string): QuickLogin | null {
  const user = userId?.trim() ?? ''
  const pass = password?.trim() ?? ''
  const secret = totpSecret?.trim() ?? ''
  if (!user || !pass || !secret) return null
  return { userId: user, password: pass, totpSecret: secret }
}

export function quickLoginForPartner(partnerId: string): QuickLogin | null {
  switch (partnerId) {
    case 'smc':
      return login(
        import.meta.env.VITE_QUICK_LOGIN_SMC_USER,
        import.meta.env.VITE_QUICK_LOGIN_SMC_PASSWORD,
        import.meta.env.VITE_QUICK_LOGIN_SMC_TOTP,
      )
    case 'tradebulls':
      return login(
        import.meta.env.VITE_QUICK_LOGIN_TRADEBULLS_USER,
        import.meta.env.VITE_QUICK_LOGIN_TRADEBULLS_PASSWORD,
        import.meta.env.VITE_QUICK_LOGIN_TRADEBULLS_TOTP,
      )
    case 'tradesmart':
      return login(
        import.meta.env.VITE_QUICK_LOGIN_TRADESMART_USER,
        import.meta.env.VITE_QUICK_LOGIN_TRADESMART_PASSWORD,
        import.meta.env.VITE_QUICK_LOGIN_TRADESMART_TOTP,
      )
    case 'globecapital':
      return login(
        import.meta.env.VITE_QUICK_LOGIN_GLOBE_USER,
        import.meta.env.VITE_QUICK_LOGIN_GLOBE_PASSWORD,
        import.meta.env.VITE_QUICK_LOGIN_GLOBE_TOTP,
      )
    default:
      return null
  }
}
