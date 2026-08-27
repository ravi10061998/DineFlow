import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { FILE_STORAGE_GATEWAY } from "./file-storage.interface";
import { LocalDiskStorageGateway } from "./local-disk-storage.gateway";
import { CloudflareR2StorageGateway } from "./cloudflare-r2-storage.gateway";

/**
 * The first gateway in this app whose concrete implementation is actually chosen at runtime
 * rather than hardcoded to one Mock class (contrast `PaymentGateway`/`NotificationGateway`, both
 * always `Mock*` today, real swap-in deliberately left for later). Storage's local/remote split
 * is real and needed now: local disk is fine for a laptop, actively wrong on any host with
 * ephemeral disk (this app's own Render free-tier deployment included) since every uploaded file
 * vanishes on the next restart. Presence of `R2_ACCOUNT_ID` is what decides it -- unset, and
 * local dev keeps working with zero external account required, same as always.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FILE_STORAGE_GATEWAY,
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>("R2_ACCOUNT_ID")) {
          return new CloudflareR2StorageGateway(configService);
        }
        return new LocalDiskStorageGateway();
      },
      inject: [ConfigService],
    },
  ],
  exports: [FILE_STORAGE_GATEWAY],
})
export class StorageModule {}
