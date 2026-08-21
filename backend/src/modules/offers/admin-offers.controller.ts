import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { OffersService } from "./offers.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { UpdateOfferDto } from "./dto/update-offer.dto";

@ApiTags("Admin - Offers")
@Controller("admin/offers")
export class AdminOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @RequirePermissions("content:read")
  async list() {
    return { message: "Offers fetched", data: await this.offersService.findAllForAdmin() };
  }

  @Post()
  @RequirePermissions("content:manage")
  async create(@Body() dto: CreateOfferDto) {
    return { message: "Offer created", data: await this.offersService.create(dto) };
  }

  @Patch(":id")
  @RequirePermissions("content:manage")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateOfferDto) {
    return { message: "Offer updated", data: await this.offersService.update(id, dto) };
  }

  @Delete(":id")
  @RequirePermissions("content:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.offersService.remove(id);
    return { message: "Offer deleted", data: null };
  }
}
