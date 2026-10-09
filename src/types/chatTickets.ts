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
  broker?: string
  status?: string
  type?: string
  subject?: string
  title?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export type PartnerTicketDetailResponse = {
  ticket: PartnerTicket
  messages: PartnerMessage[]
}

export type PartnerMessage = {
  id?: string
  _id?: string
  role?: string
  sender?: string
  content?: string
  created_at?: string
  files?: Array<{
    name?: string
    type?: string
    url?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}
