import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

/** Standard Indian IFSC format: 4 letters (bank code) + literal 0 + 6 alphanumerics (branch code). */
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export class SetBankAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  accountHolderName!: string;

  // Indian bank account numbers vary by bank (9-18 digits) — no single fixed length is correct,
  // so this validates "digits only, plausible range" rather than an exact count.
  @IsString()
  @Matches(/^\d{9,18}$/, { message: "accountNumber must be 9-18 digits" })
  accountNumber!: string;

  @IsString()
  @Matches(IFSC_PATTERN, { message: "ifscCode must be a valid IFSC (e.g. HDFC0001234)" })
  ifscCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  bankName?: string;
}
