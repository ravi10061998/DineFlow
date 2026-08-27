import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";
import { NoSuchKey, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3CompatibleStorageGateway } from "./s3-compatible-storage.gateway";

/** No real network call, no real bucket needed -- S3Client.send is mocked, so this verifies this
 * gateway builds the right S3-compatible commands and maps errors correctly, independent of
 * whether an actual provider (R2, B2, MinIO, ...) is reachable. */
jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return { ...actual, S3Client: jest.fn() };
});

describe("S3CompatibleStorageGateway", () => {
  let send: jest.Mock;
  let gateway: S3CompatibleStorageGateway;
  let clientCtorArgs: Record<string, unknown>;

  beforeEach(() => {
    send = jest.fn();
    const S3ClientMock = require("@aws-sdk/client-s3").S3Client as jest.Mock;
    S3ClientMock.mockImplementation((args: Record<string, unknown>) => {
      clientCtorArgs = args;
      return { send };
    });

    const configValues: Record<string, string> = {
      S3_ENDPOINT: "https://s3.us-west-004.backblazeb2.com",
      S3_BUCKET_NAME: "dineflow-uploads",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    };
    const configService = {
      getOrThrow: (k: string) => configValues[k],
      get: (k: string, fallback?: string) => configValues[k] ?? fallback,
    } as unknown as ConfigService;
    gateway = new S3CompatibleStorageGateway(configService);
  });

  it("constructs the S3 client with the configured endpoint, path-style addressing, and region defaulting to auto", () => {
    expect(clientCtorArgs).toMatchObject({
      endpoint: "https://s3.us-west-004.backblazeb2.com",
      region: "auto",
      forcePathStyle: true,
    });
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

  it("read translates the provider's NoSuchKey into NotFoundException", async () => {
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
