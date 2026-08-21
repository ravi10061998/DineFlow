export interface AppNotification {
  id: string;
  type: "ORDER_UPDATE" | "OFFER" | "ANNOUNCEMENT";
  title: string;
  body: string;
  relatedOrderId: string | null;
  isRead: boolean;
  createdAt: string;
}
