import { ArrayMinSize, ArrayUnique, IsUUID } from "class-validator";

export class ReorderCategoriesDto {
  @IsUUID(undefined, { each: true })
  @ArrayUnique()
  @ArrayMinSize(1)
  orderedIds!: string[];
}
