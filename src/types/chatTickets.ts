export type PartnerBody = {
  user: 'partner'
  brokers: string[]
}

export type PartnerTicketListFilters = {
  status?: string
  type?: string
  unread_for?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export type PartnerTicketListResponse = {
  tickets?: PartnerTicket[]
  data?: PartnerTicket[]
  total?: number
  page?: number
  limit?: number
  [key: string]: unknown
}

export type PartnerTicket = {
  id?: string
  _id?: string
  ticketNo?: string
  ticket_no?: string
  broker?: string
  status?: string
  type?: string
  subject?: string
  title?: string
  user_id?: string
  userId?: string
  client_id?: string
  clientId?: string
  created_by?: string
  createdBy?: string
  issue?: string
  query?: string
  priority?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  last_message?: string
  unread?: boolean
  unread_count?: number
  unreadForSupport?: boolean
  unreadForInternal?: boolean
  unreadForUser?: boolean
  [key: string]: unknown
}

export type PartnerTicketDetailResponse = {
  ticket: PartnerTicket
  messages: PartnerMessage[]
}

export type PartnerMessage = {
  id?: string
  _id?: string
  ticketId?: string
  role?: string
  sender?: string
  senderType?: 'bot' | 'user' | 'support' | string
  sender_type?: string
  userId?: string | null
  user_id?: string | null
  content?: string
  text?: string
  message?: string
  media?: unknown[]
  mediaUrls?: string[]
  created_at?: string
  createdAt?: string
  files?: Array<{
    name?: string
    filename?: string
    type?: string
    url?: string
    [key: string]: unknown
  }>
  attachments?: Array<{
    name?: string
    filename?: string
    type?: string
    url?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}
