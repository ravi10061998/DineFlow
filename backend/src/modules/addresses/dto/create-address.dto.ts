import { IsBoolean, IsEnum, IsLatitude, IsLongitude, IsOptional, IsPhoneNumber, IsString, Length, MaxLength } from "class-validator";
import { AddressLabel } from "../entities/customer-address.entity";

export class CreateAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsString()
  @MaxLength(255)
  receiverName!: string;

  @IsPhoneNumber(undefined)
  receiverPhone!: string;

  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsString()
  @MaxLength(120)
  state!: string;

  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @IsString()
  @Length(2, 2)
  country!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
