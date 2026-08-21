import { ArrayMinSize, ArrayUnique, IsUUID } from "class-validator";

export class ReorderProductsDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID(undefined, { each: true })
  @ArrayUnique()
  @ArrayMinSize(1)
  orderedIds!: string[];
}
