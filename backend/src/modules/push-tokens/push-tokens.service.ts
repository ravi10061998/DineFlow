import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PushToken, PushPlatform } from "./entities/push-token.entity";

@Injectable()
export class PushTokensService {
  constructor(@InjectRepository(PushToken) private readonly repository: Repository<PushToken>) {}

  /**
   * Upsert by token, not by (userId, token): a token identifies one physical
   * installation. If a different account logs into the same device, this
   * reassigns ownership rather than leaving a stale row pointing at whoever
   * registered it first (and never accumulates duplicate rows per device).
   */
  async register(userId: string, token: string, platform: PushPlatform): Promise<PushToken> {
    const existing = await this.repository.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      return this.repository.save(existing);
    }
    return this.repository.save(this.repository.create({ userId, token, platform }));
  }

  async unregister(userId: string, token: string): Promise<void> {
    await this.repository.delete({ userId, token });
  }

  findAllForUser(userId: string): Promise<PushToken[]> {
    return this.repository.find({ where: { userId } });
  }
}
