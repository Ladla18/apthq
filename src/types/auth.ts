export interface LoginUser {
  id?: string
  userId?: string
  name?: string
  email?: string
  role?: string
  [key: string]: unknown
}

export interface LoginResponseData {
  token?: string
  accessToken?: string
  access_token?: string
  user?: LoginUser
  [key: string]: unknown
}

export interface LoginResponse {
  success?: boolean
  message?: string
  token?: string
  accessToken?: string
  access_token?: string
  data?: LoginResponseData | string
  user?: LoginUser
  [key: string]: unknown
}

export interface OtpRequestBody {
  email: string
}

export interface OtpVerifyBody extends OtpRequestBody {
  code: string
}

export interface OtpApiResponse {
  success?: boolean
  message?: string
  token?: string
  accessToken?: string
  access_token?: string
  data?: LoginResponseData | string
  [key: string]: unknown
}
