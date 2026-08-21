import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class AddCartItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  addonIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;

  /** Confirms clearing the existing cart when adding an item from a different restaurant. */
  @IsOptional()
  @IsBoolean()
  replaceCart?: boolean;
}
