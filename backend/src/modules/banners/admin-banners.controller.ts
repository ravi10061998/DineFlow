import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { BannersService } from "./banners.service";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";

@ApiTags("Admin - Banners")
@Controller("admin/banners")
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @RequirePermissions("content:read")
  async list() {
    return { message: "Banners fetched", data: await this.bannersService.findAllForAdmin() };
  }

  @Post()
  @RequirePermissions("content:manage")
  async create(@Body() dto: CreateBannerDto) {
    return { message: "Banner created", data: await this.bannersService.create(dto) };
  }

  @Patch(":id")
  @RequirePermissions("content:manage")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return { message: "Banner updated", data: await this.bannersService.update(id, dto) };
  }

  @Delete(":id")
  @RequirePermissions("content:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.bannersService.remove(id);
    return { message: "Banner deleted", data: null };
  }
}
