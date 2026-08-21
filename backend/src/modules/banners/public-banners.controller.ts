import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { BannersService } from "./banners.service";

@ApiTags("Public - Storefront")
@Public()
@Controller("store/banners")
export class PublicBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async list() {
    return { message: "Banners fetched", data: await this.bannersService.findActiveForStore() };
  }
}
