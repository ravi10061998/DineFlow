import { IsEmail, IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

export class RegisterRestaurantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  restaurantName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  ownerFullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

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
}
