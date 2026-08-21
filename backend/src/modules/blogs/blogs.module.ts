import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Blog } from "./entities/blog.entity";
import { BlogCategory } from "./entities/blog-category.entity";
import { BlogsService } from "./blogs.service";
import { PublicBlogsController } from "./public-blogs.controller";
import { AdminBlogsController } from "./admin-blogs.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Blog, BlogCategory])],
  controllers: [PublicBlogsController, AdminBlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
