export type NotificationChannel = "EMAIL" | "SMS";
export type NotificationDeliveryStatus = "SENT" | "FAILED";

export interface NotificationDelivery {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  status: NotificationDeliveryStatus;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
}
