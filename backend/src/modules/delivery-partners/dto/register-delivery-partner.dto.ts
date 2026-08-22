import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { VehicleType } from "../entities/delivery-partner.entity";

export class RegisterDeliveryPartnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  @MaxLength(20)
  vehicleNumber!: string;

  @IsString()
  @MaxLength(50)
  licenseNumber!: string;
}
