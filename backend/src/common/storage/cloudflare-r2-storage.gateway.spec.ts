import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";
import { NoSuchKey, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { CloudflareR2StorageGateway } from "./cloudflare-r2-storage.gateway";

/** No real network call, no real R2 account needed -- S3Client.send is mocked, so this verifies
 * this gateway builds the right S3-compatible commands and maps R2's own errors correctly,
 * independent of whether an actual bucket is reachable. */
jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return { ...actual, S3Client: jest.fn() };
});

describe("CloudflareR2StorageGateway", () => {
  let send: jest.Mock;
  let gateway: CloudflareR2StorageGateway;

  beforeEach(() => {
    send = jest.fn();
    (require("@aws-sdk/client-s3").S3Client as jest.Mock).mockImplementation(() => ({ send }));

    const configValues: Record<string, string> = {
      R2_ACCOUNT_ID: "acct123",
      R2_BUCKET_NAME: "dineflow-uploads",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    };
    const configService = { getOrThrow: (k: string) => configValues[k] } as unknown as ConfigService;
    gateway = new CloudflareR2StorageGateway(configService);
  });

  it("save sends a PutObjectCommand with the bucket, key, body, and content type", async () => {
    send.mockResolvedValueOnce({});
    await gateway.save("restaurant-logos/r1/logo.jpg", Buffer.from("bytes"), "image/jpeg");

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "dineflow-uploads",
      Key: "restaurant-logos/r1/logo.jpg",
      ContentType: "image/jpeg",
    });
  });

  it("read sends a GetObjectCommand and returns the body stream and size", async () => {
    const fakeStream = Readable.from([Buffer.from("hi")]);
    send.mockResolvedValueOnce({ Body: fakeStream, ContentLength: 2 });

    const result = await gateway.read("products/p1/photo.jpg");

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toMatchObject({ Bucket: "dineflow-uploads", Key: "products/p1/photo.jpg" });
    expect(result.stream).toBe(fakeStream);
    expect(result.sizeBytes).toBe(2);
  });

  it("read translates R2's NoSuchKey into NotFoundException", async () => {
    send.mockRejectedValueOnce(new NoSuchKey({ message: "not found", $metadata: {} }));
    await expect(gateway.read("missing/key.jpg")).rejects.toThrow(NotFoundException);
  });

  it("read rethrows any other error unchanged", async () => {
    const boom = new Error("network exploded");
    send.mockRejectedValueOnce(boom);
    await expect(gateway.read("some/key.jpg")).rejects.toThrow("network exploded");
  });

  it("delete sends a DeleteObjectCommand", async () => {
    send.mockResolvedValueOnce({});
    await gateway.delete("customers/u1/photo.jpg");

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toMatchObject({ Bucket: "dineflow-uploads", Key: "customers/u1/photo.jpg" });
  });

  it("delete never throws, even if the underlying call rejects", async () => {
    send.mockRejectedValueOnce(new Error("already gone"));
    await expect(gateway.delete("customers/u1/photo.jpg")).resolves.not.toThrow();
  });
});
