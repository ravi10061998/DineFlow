import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PushTokensService } from "./push-tokens.service";
import { PushToken, PushPlatform } from "./entities/push-token.entity";

describe("PushTokensService", () => {
  let service: PushTokensService;
  let repo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PushTokensService, { provide: getRepositoryToken(PushToken), useValue: repo }],
    }).compile();

    service = moduleRef.get(PushTokensService);
  });

  it("creates a new row for a token never seen before", async () => {
    repo.findOne.mockResolvedValue(null);

    await service.register("u1", "ExponentPushToken[abc]", PushPlatform.IOS);

    expect(repo.create).toHaveBeenCalledWith({ userId: "u1", token: "ExponentPushToken[abc]", platform: PushPlatform.IOS });
    expect(repo.save).toHaveBeenCalled();
  });

  it("reassigns an existing token to whichever user just registered it, instead of duplicating the row", async () => {
    const existing = { id: "pt1", userId: "old-user", token: "ExponentPushToken[abc]", platform: PushPlatform.ANDROID };
    repo.findOne.mockResolvedValue(existing);

    await service.register("new-user", "ExponentPushToken[abc]", PushPlatform.IOS);

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: "pt1", userId: "new-user", platform: PushPlatform.IOS }));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("unregisters a token scoped to the owning user", async () => {
    await service.unregister("u1", "ExponentPushToken[abc]");

    expect(repo.delete).toHaveBeenCalledWith({ userId: "u1", token: "ExponentPushToken[abc]" });
  });

  it("lists every device registered for a user", async () => {
    repo.find.mockResolvedValue([{ token: "a" }, { token: "b" }]);

    await expect(service.findAllForUser("u1")).resolves.toEqual([{ token: "a" }, { token: "b" }]);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});
