import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationDelivery, NotificationChannel, NotificationDeliveryStatus } from "./entities/notification-delivery.entity";
import { NOTIFICATION_GATEWAY } from "./gateways/notification-gateway.interface";

describe("NotificationDispatchService", () => {
  let service: NotificationDispatchService;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let gateway: { sendEmail: jest.Mock; sendSms: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn().mockResolvedValue([]) };
    gateway = { sendEmail: jest.fn(), sendSms: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        { provide: getRepositoryToken(NotificationDelivery), useValue: repo },
        { provide: NOTIFICATION_GATEWAY, useValue: gateway },
      ],
    }).compile();

    service = moduleRef.get(NotificationDispatchService);
  });

  it("records a SENT delivery when the gateway succeeds", async () => {
    await service.sendEmail({ to: "casey@example.com", subject: "Hi", body: "Body" }, { relatedType: "TEST", relatedId: "x1" });

    expect(gateway.sendEmail).toHaveBeenCalledWith({ to: "casey@example.com", subject: "Hi", body: "Body" });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        recipient: "casey@example.com",
        status: NotificationDeliveryStatus.SENT,
        relatedType: "TEST",
        relatedId: "x1",
      }),
    );
  });

  it("records a FAILED delivery, without throwing, when the gateway rejects", async () => {
    gateway.sendEmail.mockRejectedValue(new Error("smtp down"));

    await expect(service.sendEmail({ to: "casey@example.com", subject: "Hi", body: "Body" })).resolves.toBeUndefined();

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: NotificationDeliveryStatus.FAILED }));
  });

  it("records an SMS delivery with no subject", async () => {
    await service.sendSms({ to: "+919999999999", body: "Your OTP is 1234" });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ channel: NotificationChannel.SMS, subject: null }));
  });

  it("defaults relatedType/relatedId to null when no context is given", async () => {
    await service.sendEmail({ to: "casey@example.com", subject: "Hi", body: "Body" });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ relatedType: null, relatedId: null }));
  });
});
