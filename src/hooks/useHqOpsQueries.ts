import { useMutation } from '@tanstack/react-query'
import {
  fetchOrphanDiagnosis,
  redirectSelectedClientLogin,
  fetchWebhookSignals,
} from '../lib/hqOpsApi'
import type {
  InternalUserRedirectQuery,
  OrphanDiagnosisQuery,
  WebhookSignalsQuery,
} from '../types/hqOps'

export function useWebhookSignalsSearch() {
  return useMutation({
    mutationFn: (query: WebhookSignalsQuery) => fetchWebhookSignals(query),
  })
}

export function useOrphanDiagnosis() {
  return useMutation({
    mutationFn: (query: OrphanDiagnosisQuery) => fetchOrphanDiagnosis(query),
  })
}

export function useInternalUserRedirect() {
  return useMutation({
    mutationFn: (query: InternalUserRedirectQuery) => redirectSelectedClientLogin(query),
  })
}
