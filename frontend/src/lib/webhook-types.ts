export interface WebhookEvent {
  id: string;
  gateway: string;
  gatewayEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureValid: boolean;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
}
