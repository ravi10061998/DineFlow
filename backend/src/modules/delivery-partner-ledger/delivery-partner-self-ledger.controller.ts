import { Controller, Get, NotFoundException, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { DeliveryPartnerGuard } from "../delivery-partners/guards/delivery-partner.guard";
import { DeliveryPartner } from "../delivery-partners/entities/delivery-partner.entity";
import { DeliveryPartnerLedgerService } from "./delivery-partner-ledger.service";

@ApiTags("Delivery Partner Self-Service - Ledger")
@UseGuards(DeliveryPartnerGuard)
@Controller("delivery-partner/me/ledger")
export class DeliveryPartnerSelfLedgerController {
  constructor(
    @InjectRepository(DeliveryPartner) private readonly partnersRepository: Repository<DeliveryPartner>,
    private readonly ledgerService: DeliveryPartnerLedgerService,
  ) {}

  @Get()
  async getLedger(@CurrentUser() user: AuthenticatedUser) {
    const partner = await this.partnersRepository.findOne({ where: { userId: user.userId } });
    if (!partner) {
      throw new NotFoundException("Delivery partner profile not found");
    }
    return { message: "Ledger fetched", data: await this.ledgerService.getForPartner(partner.id) };
  }
}
