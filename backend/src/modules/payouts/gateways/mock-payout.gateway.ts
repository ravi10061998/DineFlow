import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { GatewayPayout, PayoutGateway } from "./payout-gateway.interface";

/** Always-succeeds mock, same shape as MockPaymentGateway/MockRefund — no real gateway credentials exist in this dev environment. */
@Injectable()
export class MockPayoutGateway implements PayoutGateway {
  readonly name = "MOCK";

  async payout(restaurantId: string, amount: number): Promise<GatewayPayout> {
    void restaurantId; // a real gateway needs the restaurant's bank/beneficiary details; unused by the mock
    void amount;
    return { gatewayPayoutId: `mock_payout_${crypto.randomBytes(8).toString("hex")}` };
  }
}
