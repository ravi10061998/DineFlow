import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { SubscriptionsService } from "./subscriptions.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdateTrialSettingsDto } from "./dto/update-trial-settings.dto";

@ApiTags("Admin - Subscriptions")
@Controller("admin")
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("subscription-plans")
  @RequirePermissions("subscriptions:read")
  async listPlans(@Query("includeInactive") includeInactive?: string) {
    const plans = await this.subscriptionsService.findAllPlans(includeInactive === "true");
    return { message: "Plans fetched", data: plans };
  }

  @Post("subscription-plans")
  @RequirePermissions("subscriptions:manage")
  async createPlan(@Body() dto: CreatePlanDto) {
    return { message: "Plan created", data: await this.subscriptionsService.createPlan(dto) };
  }

  @Patch("subscription-plans/:id")
  @RequirePermissions("subscriptions:manage")
  async updatePlan(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return { message: "Plan updated", data: await this.subscriptionsService.updatePlan(id, dto) };
  }

  @Delete("subscription-plans/:id")
  @RequirePermissions("subscriptions:manage")
  async deletePlan(@Param("id", ParseUUIDPipe) id: string) {
    await this.subscriptionsService.deletePlan(id);
    return { message: "Plan deleted", data: null };
  }

  @Get("trial-settings")
  @RequirePermissions("subscriptions:read")
  async getTrialSettings() {
    return { message: "Trial settings fetched", data: await this.subscriptionsService.getTrialSettings() };
  }

  @Patch("trial-settings")
  @RequirePermissions("subscriptions:manage")
  async updateTrialSettings(@Body() dto: UpdateTrialSettingsDto) {
    return { message: "Trial settings updated", data: await this.subscriptionsService.updateTrialSettings(dto) };
  }

  @Get("restaurants/:id/subscription")
  @RequirePermissions("restaurants:read")
  async getRestaurantSubscription(@Param("id", ParseUUIDPipe) id: string) {
    const subscription = await this.subscriptionsService.findForRestaurantOrNull(id);
    return { message: "Subscription fetched", data: subscription };
  }
}
