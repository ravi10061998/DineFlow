import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { DeliveryPartnerLedgerService } from "./delivery-partner-ledger.service";
import { UpdateDeliveryPartnerFeeSettingsDto } from "./dto/update-delivery-partner-fee-settings.dto";

@ApiTags("Admin - Delivery Partner Ledger")
@Controller("admin")
export class AdminDeliveryPartnerLedgerController {
  constructor(private readonly ledgerService: DeliveryPartnerLedgerService) {}

  @Get("delivery-partners/:id/ledger")
  @RequirePermissions("delivery_partner_ledger:read")
  async getLedger(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Ledger fetched", data: await this.ledgerService.getForPartner(id) };
  }

  @Get("delivery-partner-payouts")
  @RequirePermissions("delivery_partner_ledger:read")
  async listPayouts() {
    return { message: "Payouts fetched", data: await this.ledgerService.findAllPayoutsForAdmin() };
  }

  @Post("delivery-partner-payouts/:id/retry")
  @RequirePermissions("delivery_partner_ledger:manage")
  async retryPayout(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Payout retried", data: await this.ledgerService.retryPayout(id) };
  }

  @Post("delivery-partners/:id/payouts/run")
  @RequirePermissions("delivery_partner_ledger:manage")
  async runPayout(@Param("id", ParseUUIDPipe) id: string) {
    const payout = await this.ledgerService.runPayout(id);
    return { message: payout ? "Payout created" : "Nothing to pay out — no unpaid balance", data: payout };
  }

  @Post("delivery-partner-payouts/run-all")
  @RequirePermissions("delivery_partner_ledger:manage")
  async runAllPayouts() {
    const payouts = await this.ledgerService.runPayoutForAllPartners();
    return { message: `${payouts.length} payout(s) created`, data: payouts };
  }

  @Get("delivery-partner-fee-settings")
  @RequirePermissions("delivery_partner_ledger:read")
  async getFeeSettings() {
    return { message: "Delivery partner fee settings fetched", data: await this.ledgerService.getFeeSettings() };
  }

  @Patch("delivery-partner-fee-settings")
  @RequirePermissions("delivery_partner_ledger:manage")
  async updateFeeSettings(@Body() dto: UpdateDeliveryPartnerFeeSettingsDto) {
    return { message: "Delivery partner fee settings updated", data: await this.ledgerService.updateFeeSettings(dto) };
  }
}
