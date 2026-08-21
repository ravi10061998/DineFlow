import { IsDateString, IsEnum, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";
import { Gender } from "../entities/customer-profile.entity";

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
