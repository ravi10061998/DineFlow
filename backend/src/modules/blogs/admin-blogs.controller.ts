import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { BlogsService } from "./blogs.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { CreateBlogCategoryDto } from "./dto/create-blog-category.dto";

@ApiTags("Admin - Blogs")
@Controller("admin/blogs")
export class AdminBlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @RequirePermissions("content:read")
  async list() {
    return { message: "Blogs fetched", data: await this.blogsService.findAllForAdmin() };
  }

  @Post()
  @RequirePermissions("content:manage")
  async create(@Body() dto: CreateBlogDto) {
    return { message: "Blog created", data: await this.blogsService.create(dto) };
  }

  @Patch(":id")
  @RequirePermissions("content:manage")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBlogDto) {
    return { message: "Blog updated", data: await this.blogsService.update(id, dto) };
  }

  @Delete(":id")
  @RequirePermissions("content:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.blogsService.remove(id);
    return { message: "Blog deleted", data: null };
  }

  @Post("categories")
  @RequirePermissions("content:manage")
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    return { message: "Blog category created", data: await this.blogsService.createCategory(dto) };
  }
}
