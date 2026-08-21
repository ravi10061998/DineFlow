import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { Blog } from "./entities/blog.entity";
import { BlogCategory } from "./entities/blog-category.entity";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { CreateBlogCategoryDto } from "./dto/create-blog-category.dto";
import { BlogErrors } from "../../common/exceptions/business.exception";

const UNIQUE_VIOLATION = "23505";
const PAGE_SIZE = 12;

export interface PaginatedBlogs {
  items: Blog[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(Blog) private readonly blogsRepository: Repository<Blog>,
    @InjectRepository(BlogCategory) private readonly categoriesRepository: Repository<BlogCategory>,
  ) {}

  async findPublished(page: number, categorySlug?: string): Promise<PaginatedBlogs> {
    const safePage = Math.max(1, page);

    // Resolve the slug to an id first and filter by a plain FK match, rather than joining +
    // ordering + paginating in one query builder call — mixing leftJoinAndSelect with a raw-column
    // orderBy and skip/take is a known TypeORM footgun (crashes inside its own query planner).
    let categoryId: string | undefined;
    if (categorySlug) {
      const category = await this.categoriesRepository.findOne({ where: { slug: categorySlug } });
      if (!category) {
        return { items: [], total: 0, page: safePage, pageSize: PAGE_SIZE };
      }
      categoryId = category.id;
    }

    const [items, total] = await this.blogsRepository.findAndCount({
      where: { isPublished: true, ...(categoryId ? { categoryId } : {}) },
      relations: { category: true },
      order: { publishedAt: "DESC" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return { items, total, page: safePage, pageSize: PAGE_SIZE };
  }

  async findPublishedBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogsRepository.findOne({ where: { slug, isPublished: true }, relations: { category: true } });
    if (!blog) throw new NotFoundException("Blog not found");
    return blog;
  }

  findCategories(): Promise<BlogCategory[]> {
    return this.categoriesRepository.find({ order: { name: "ASC" } });
  }

  findAllForAdmin(): Promise<Blog[]> {
    return this.blogsRepository.find({ relations: { category: true }, order: { createdAt: "DESC" } });
  }

  async findOneOrThrow(id: string): Promise<Blog> {
    const blog = await this.blogsRepository.findOne({ where: { id }, relations: { category: true } });
    if (!blog) throw new NotFoundException("Blog not found");
    return blog;
  }

  async createCategory(dto: CreateBlogCategoryDto): Promise<BlogCategory> {
    const category = this.categoriesRepository.create(dto);
    try {
      return await this.categoriesRepository.save(category);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
        throw BlogErrors.categorySlugTaken(dto.slug);
      }
      throw err;
    }
  }

  async create(dto: CreateBlogDto): Promise<Blog> {
    const blog = this.blogsRepository.create({
      title: dto.title,
      slug: dto.slug,
      coverImageUrl: dto.coverImageUrl ?? null,
      categoryId: dto.categoryId ?? null,
      authorName: dto.authorName,
      excerpt: dto.excerpt,
      content: dto.content,
      readingTimeMinutes: dto.readingTimeMinutes ?? 3,
      isPublished: dto.isPublished ?? false,
      publishedAt: dto.isPublished ? new Date() : null,
    });
    try {
      return await this.blogsRepository.save(blog);
    } catch (err) {
      throw this.mapDuplicateSlug(err, dto.slug);
    }
  }

  async update(id: string, dto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.findOneOrThrow(id);
    const isNewlyPublished = dto.isPublished === true && !blog.isPublished;
    Object.assign(blog, dto);
    if (isNewlyPublished) {
      blog.publishedAt = new Date();
    }
    try {
      return await this.blogsRepository.save(blog);
    } catch (err) {
      throw this.mapDuplicateSlug(err, dto.slug ?? blog.slug);
    }
  }

  async remove(id: string): Promise<void> {
    const blog = await this.findOneOrThrow(id);
    await this.blogsRepository.remove(blog);
  }

  private mapDuplicateSlug(err: unknown, slug: string): unknown {
    if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
      return BlogErrors.slugTaken(slug);
    }
    return err;
  }
}
