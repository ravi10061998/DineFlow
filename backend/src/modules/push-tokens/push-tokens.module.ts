import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PushToken } from "./entities/push-token.entity";
import { PushTokensService } from "./push-tokens.service";
import { CustomerPushTokensController } from "./customer-push-tokens.controller";

/**
 * Deliberately zero module-level dependencies beyond TypeOrm, same reasoning
 * as NotificationGatewayModule and ReviewsModule — the in-app Notifications
 * module needs to look up a customer's registered devices without pulling in
 * a dependency graph, and nothing here needs anything from Notifications.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [CustomerPushTokensController],
  providers: [PushTokensService],
  exports: [PushTokensService],
})
export class PushTokensModule {}
