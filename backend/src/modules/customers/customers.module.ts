import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerProfile } from "./entities/customer-profile.entity";
import { CustomerProfileService } from "./customer-profile.service";
import { CustomerProfileImagesService } from "./customer-profile-images.service";
import { CustomerProfileController } from "./customer-profile.controller";
import { UsersModule } from "../users/users.module";
import { StorageModule } from "../../common/storage/storage.module";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerProfile]), UsersModule, StorageModule],
  controllers: [CustomerProfileController],
  providers: [CustomerProfileService, CustomerProfileImagesService],
})
export class CustomersModule {}
