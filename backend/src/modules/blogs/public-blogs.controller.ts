import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { BlogsService } from "./blogs.service";

@ApiTags("Public - Storefront")
@Public()
@Controller("store/blogs")
export class PublicBlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  async list(@Query("page") page?: string, @Query("category") category?: string) {
    const data = await this.blogsService.findPublished(page ? Number(page) : 1, category);
    return { message: "Blogs fetched", data };
  }

  @Get("categories")
  async categories() {
    return { message: "Blog categories fetched", data: await this.blogsService.findCategories() };
  }

  @Get(":slug")
  async getOne(@Param("slug") slug: string) {
    return { message: "Blog fetched", data: await this.blogsService.findPublishedBySlug(slug) };
  }
}
