import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationDelivery, NotificationChannel, NotificationDeliveryStatus } from "./entities/notification-delivery.entity";
import { NOTIFICATION_GATEWAY, NotificationGateway, SendEmailParams, SendPushParams, SendSmsParams } from "./gateways/notification-gateway.interface";

/** Optional context recorded on the delivery-log row so an admin can trace which domain event caused a send. */
export interface DeliveryContext {
  relatedType?: string;
  relatedId?: string;
}

/**
 * The thing every OTHER module actually injects — not the raw gateway.
 * Calls the swappable gateway to "send," then records the attempt to
 * `notification_deliveries` regardless of outcome (mirrors how
 * PaymentsService/PayoutsService always persist a row for their own gateway
 * calls, success or failure, rather than only recording the happy path).
 */
@Injectable()
export class NotificationDispatchService {
  constructor(
    @Inject(NOTIFICATION_GATEWAY) private readonly gateway: NotificationGateway,
    @InjectRepository(NotificationDelivery) private readonly repository: Repository<NotificationDelivery>,
  ) {}

  async sendEmail(params: SendEmailParams, context: DeliveryContext = {}): Promise<void> {
    const status = await this.attempt(() => this.gateway.sendEmail(params));
    await this.record(NotificationChannel.EMAIL, params.to, params.subject, params.body, status, context);
  }

  async sendSms(params: SendSmsParams, context: DeliveryContext = {}): Promise<void> {
    const status = await this.attempt(() => this.gateway.sendSms(params));
    await this.record(NotificationChannel.SMS, params.to, null, params.body, status, context);
  }

  async sendPush(params: SendPushParams, context: DeliveryContext = {}): Promise<void> {
    const status = await this.attempt(() => this.gateway.sendPush(params));
    await this.record(NotificationChannel.PUSH, params.to, params.title, params.body, status, context);
  }

  findAllForAdmin(): Promise<NotificationDelivery[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  private async attempt(send: () => Promise<void>): Promise<NotificationDeliveryStatus> {
    try {
      await send();
      return NotificationDeliveryStatus.SENT;
    } catch {
      // A real gateway can genuinely fail (network, invalid recipient, rate limit) — recorded, never thrown
      // back at the caller, since a notification failure must never roll back the business action that triggered it.
      return NotificationDeliveryStatus.FAILED;
    }
  }

  private async record(
    channel: NotificationChannel,
    recipient: string,
    subject: string | null,
    body: string,
    status: NotificationDeliveryStatus,
    context: DeliveryContext,
  ): Promise<void> {
    const delivery = this.repository.create({
      channel,
      recipient,
      subject,
      body,
      status,
      relatedType: context.relatedType ?? null,
      relatedId: context.relatedId ?? null,
    });
    await this.repository.save(delivery);
  }
}
