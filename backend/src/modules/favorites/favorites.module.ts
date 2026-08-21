import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Favorite } from "./entities/favorite.entity";
import { FavoritesService } from "./favorites.service";
import { CustomerFavoritesController } from "./customer-favorites.controller";
import { RestaurantsModule } from "../restaurants/restaurants.module";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [TypeOrmModule.forFeature([Favorite]), RestaurantsModule, ProductsModule],
  controllers: [CustomerFavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
