import { NotFoundException } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { LocalDiskStorageGateway, LOCAL_UPLOAD_ROOT } from "./local-disk-storage.gateway";

/** Real filesystem, scoped to a throwaway key prefix per test run — deterministic, no mocking
 * needed, and cleaned up after so repeat runs never see another run's leftovers. */
describe("LocalDiskStorageGateway", () => {
  let gateway: LocalDiskStorageGateway;
  let testPrefix: string;

  beforeEach(() => {
    gateway = new LocalDiskStorageGateway();
    testPrefix = `__test__/${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    await fs.rm(path.join(LOCAL_UPLOAD_ROOT, "__test__"), { recursive: true, force: true });
  });

  it("saves a buffer and reads it back byte-for-byte", async () => {
    const key = `${testPrefix}/hello.txt`;
    const original = Buffer.from("hello dineflow");
    await gateway.save(key, original, "text/plain");

    const { stream, sizeBytes } = await gateway.read(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);

    expect(Buffer.concat(chunks).toString()).toBe("hello dineflow");
    expect(sizeBytes).toBe(original.length);
  });

  it("creates nested directories on save without requiring them to exist first", async () => {
    const key = `${testPrefix}/deeply/nested/path/file.bin`;
    await expect(gateway.save(key, Buffer.from("x"), "application/octet-stream")).resolves.not.toThrow();
  });

  it("throws NotFoundException reading a key that was never saved", async () => {
    await expect(gateway.read(`${testPrefix}/never-existed.jpg`)).rejects.toThrow(NotFoundException);
  });

  it("replacing a key's content is reflected on the next read", async () => {
    const key = `${testPrefix}/replace-me.txt`;
    await gateway.save(key, Buffer.from("v1"), "text/plain");
    await gateway.save(key, Buffer.from("v2 longer content"), "text/plain");

    const { stream } = await gateway.read(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe("v2 longer content");
  });

  it("delete silently no-ops on a key that doesn't exist -- never throws", async () => {
    await expect(gateway.delete(`${testPrefix}/was-never-there.jpg`)).resolves.not.toThrow();
  });

  it("delete actually removes the file -- a subsequent read throws NotFoundException", async () => {
    const key = `${testPrefix}/to-delete.txt`;
    await gateway.save(key, Buffer.from("bye"), "text/plain");
    await gateway.delete(key);
    await expect(gateway.read(key)).rejects.toThrow(NotFoundException);
  });
});
