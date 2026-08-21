import { IsEnum, IsUUID } from "class-validator";
import { FavoriteTargetType } from "../entities/favorite.entity";

export class CreateFavoriteDto {
  @IsEnum(FavoriteTargetType)
  targetType!: FavoriteTargetType;

  @IsUUID()
  targetId!: string;
}
