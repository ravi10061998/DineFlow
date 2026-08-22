import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { VehicleType } from "../entities/delivery-partner.entity";

export class UpdateDeliveryPartnerDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;
}
