import { IsEnum } from "class-validator";
import { RestaurantDocumentType } from "../entities/restaurant-document.entity";

/** The non-file field alongside the multipart `file` upload. */
export class UploadDocumentDto {
  @IsEnum(RestaurantDocumentType)
  type!: RestaurantDocumentType;
}
