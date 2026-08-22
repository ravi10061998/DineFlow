import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeliveryPartnerLedgerEntry } from "./entities/delivery-partner-ledger-entry.entity";
import { DeliveryPartnerPayout } from "./entities/delivery-partner-payout.entity";
import { DeliveryPartnerFeeSettings } from "./entities/delivery-partner-fee-settings.entity";
import { DeliveryPartner } from "../delivery-partners/entities/delivery-partner.entity";
import { DeliveryPartnerLedgerService } from "./delivery-partner-ledger.service";
import { DeliveryPartnerSelfLedgerController } from "./delivery-partner-self-ledger.controller";
import { AdminDeliveryPartnerLedgerController } from "./admin-delivery-partner-ledger.controller";
import { PAYOUT_GATEWAY } from "../payouts/gateways/payout-gateway.interface";
import { MockPayoutGateway } from "../payouts/gateways/mock-payout.gateway";

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPartnerLedgerEntry, DeliveryPartnerPayout, DeliveryPartnerFeeSettings, DeliveryPartner])],
  controllers: [DeliveryPartnerSelfLedgerController, AdminDeliveryPartnerLedgerController],
  providers: [DeliveryPartnerLedgerService, { provide: PAYOUT_GATEWAY, useClass: MockPayoutGateway }],
  exports: [DeliveryPartnerLedgerService],
})
export class DeliveryPartnerLedgerModule {}
