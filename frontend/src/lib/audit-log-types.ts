export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actorRole: string;
  method: string;
  path: string;
  success: boolean;
  errorMessage: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
