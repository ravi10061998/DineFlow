import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BannersService } from "./banners.service";
import { Banner } from "./entities/banner.entity";

describe("BannersService", () => {
  let service: BannersService;
  let repo: { create: jest.Mock; save: jest.Mock; count: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [BannersService, { provide: getRepositoryToken(Banner), useValue: repo }],
    }).compile();

    service = moduleRef.get(BannersService);
  });

  it("queries the four active-window bound combinations", async () => {
    await service.findActiveForStore();

    const args = repo.find.mock.calls[0][0];
    expect(args.where).toHaveLength(4);
    expect(args.order).toEqual({ sortOrder: "ASC" });
  });

  it("stores null start/end dates when omitted", async () => {
    const result = await service.create({ title: "Weekend Sale", imageUrl: "https://example.com/banner.jpg" });

    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("assigns the next sort order when none is given", async () => {
    repo.count.mockResolvedValue(2);

    const result = await service.create({ title: "Sale", imageUrl: "https://example.com/b.jpg" });

    expect(result.sortOrder).toBe(2);
  });
});
