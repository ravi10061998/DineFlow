import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Banner } from "./entities/banner.entity";
import { BannersService } from "./banners.service";
import { PublicBannersController } from "./public-banners.controller";
import { AdminBannersController } from "./admin-banners.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  controllers: [PublicBannersController, AdminBannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
