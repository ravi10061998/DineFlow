import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { BlogsService } from "./blogs.service";
import { Blog } from "./entities/blog.entity";
import { BlogCategory } from "./entities/blog-category.entity";

describe("BlogsService", () => {
  let service: BlogsService;
  let blogsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock; findAndCount: jest.Mock };
  let categoriesRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };

  const baseDto = { title: "Best Pizzas", slug: "best-pizzas", authorName: "DineFlow Team", excerpt: "Top picks", content: "Full article body" };

  beforeEach(async () => {
    blogsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    categoriesRepo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn(), findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BlogsService,
        { provide: getRepositoryToken(Blog), useValue: blogsRepo },
        { provide: getRepositoryToken(BlogCategory), useValue: categoriesRepo },
      ],
    }).compile();

    service = moduleRef.get(BlogsService);
  });

  it("filters by category id (resolved from the slug) only when a category is provided", async () => {
    categoriesRepo.findOne.mockResolvedValue({ id: "cat1", slug: "recipes" });

    await service.findPublished(1, "recipes");

    expect(blogsRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true, categoryId: "cat1" } }));
  });

  it("returns an empty page instead of erroring when the category slug doesn't exist", async () => {
    categoriesRepo.findOne.mockResolvedValue(null);

    const result = await service.findPublished(1, "no-such-category");

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 12 });
    expect(blogsRepo.findAndCount).not.toHaveBeenCalled();
  });

  it("does not filter by category when none is provided", async () => {
    await service.findPublished(1);

    expect(blogsRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }));
  });

  it("stamps publishedAt when created already published", async () => {
    const result = await service.create({ ...baseDto, isPublished: true });

    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("leaves publishedAt null when created as a draft", async () => {
    const result = await service.create({ ...baseDto, isPublished: false });

    expect(result.publishedAt).toBeNull();
  });

  it("stamps publishedAt on the transition from draft to published", async () => {
    blogsRepo.findOne.mockResolvedValue({ id: "b1", ...baseDto, isPublished: false, publishedAt: null });

    const result = await service.update("b1", { isPublished: true });

    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("maps a duplicate slug to BLOG_SLUG_TAKEN", async () => {
    const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
    blogsRepo.save.mockRejectedValue(dbError);

    await expect(service.create(baseDto)).rejects.toMatchObject({ code: "BLOG_SLUG_TAKEN" });
  });

  it("404s when a published blog isn't found by slug", async () => {
    blogsRepo.findOne.mockResolvedValue(null);

    await expect(service.findPublishedBySlug("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
