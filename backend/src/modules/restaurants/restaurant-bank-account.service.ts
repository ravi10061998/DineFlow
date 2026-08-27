import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RestaurantBankAccount, RestaurantBankAccountStatus } from "./entities/restaurant-bank-account.entity";
import { SetBankAccountDto } from "./dto/set-bank-account.dto";
import { BankAccountErrors } from "../../common/exceptions/business.exception";

export interface SafeBankAccountResponse {
  id: string;
  accountHolderName: string;
  maskedAccountNumber: string;
  ifscCode: string;
  bankName: string | null;
  status: RestaurantBankAccountStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RestaurantBankAccountService {
  constructor(@InjectRepository(RestaurantBankAccount) private readonly repository: Repository<RestaurantBankAccount>) {}

  async findByRestaurantId(restaurantId: string): Promise<RestaurantBankAccount | null> {
    return this.repository.findOne({ where: { restaurantId } });
  }

  async findByRestaurantIdOrThrow(restaurantId: string): Promise<RestaurantBankAccount> {
    const account = await this.findByRestaurantId(restaurantId);
    if (!account) {
      throw new NotFoundException("No bank account on file for this restaurant");
    }
    return account;
  }

  /**
   * Upsert, not create-only — a restaurant can correct a typo or switch accounts at any time.
   * Rebinding always resets to PENDING (a previously VERIFIED account doesn't stay trusted once
   * its underlying details change) and clears any RazorpayX linkage (a fund account is tied to
   * the exact account number/IFSC it was created for — reusing it after a rebind would silently
   * pay out to the OLD account).
   */
  async setBankAccount(restaurantId: string, dto: SetBankAccountDto): Promise<RestaurantBankAccount> {
    const existing = await this.findByRestaurantId(restaurantId);
    const account = existing ?? this.repository.create({ restaurantId });

    account.accountHolderName = dto.accountHolderName;
    account.accountNumber = dto.accountNumber;
    account.ifscCode = dto.ifscCode.toUpperCase();
    account.bankName = dto.bankName ?? null;
    account.status = RestaurantBankAccountStatus.PENDING;
    account.rejectionReason = null;
    account.razorpayContactId = null;
    account.razorpayFundAccountId = null;

    return this.repository.save(account);
  }

  findAllForAdmin(): Promise<RestaurantBankAccount[]> {
    return this.repository.find({ relations: { restaurant: true }, order: { createdAt: "DESC" } });
  }

  async verify(restaurantId: string): Promise<RestaurantBankAccount> {
    const account = await this.findByRestaurantIdOrThrow(restaurantId);
    if (account.status === RestaurantBankAccountStatus.VERIFIED) {
      throw BankAccountErrors.alreadyVerified();
    }
    account.status = RestaurantBankAccountStatus.VERIFIED;
    account.rejectionReason = null;
    return this.repository.save(account);
  }

  async reject(restaurantId: string, reason: string): Promise<RestaurantBankAccount> {
    const account = await this.findByRestaurantIdOrThrow(restaurantId);
    account.status = RestaurantBankAccountStatus.REJECTED;
    account.rejectionReason = reason;
    return this.repository.save(account);
  }

  /** Persists RazorpayX's own object ids once created — called only by RazorpayXPayoutGateway, never by a controller. */
  async recordRazorpayLinkage(id: string, contactId: string, fundAccountId: string): Promise<void> {
    await this.repository.update(id, { razorpayContactId: contactId, razorpayFundAccountId: fundAccountId });
  }

  toSafeResponse(account: RestaurantBankAccount): SafeBankAccountResponse {
    return {
      id: account.id,
      accountHolderName: account.accountHolderName,
      maskedAccountNumber: `••••${account.accountNumber.slice(-4)}`,
      ifscCode: account.ifscCode,
      bankName: account.bankName,
      status: account.status,
      rejectionReason: account.rejectionReason,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
