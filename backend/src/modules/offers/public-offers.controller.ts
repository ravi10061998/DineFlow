import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { OffersService } from "./offers.service";

@ApiTags("Public - Storefront")
@Public()
@Controller("store/offers")
export class PublicOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  async list() {
    return { message: "Offers fetched", data: await this.offersService.findActiveForStore() };
  }
}
