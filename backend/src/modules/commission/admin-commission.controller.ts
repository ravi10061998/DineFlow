import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CommissionService } from "./commission.service";
import { CreateCommissionRuleDto } from "./dto/create-commission-rule.dto";
import { UpdateCommissionRuleDto } from "./dto/update-commission-rule.dto";
import { CalculatePreviewDto } from "./dto/calculate-preview.dto";

@ApiTags("Admin - Commission")
@Controller("admin")
export class AdminCommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get("commission-rules")
  @RequirePermissions("commission:read")
  async listRules(@Query("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Commission rules fetched", data: await this.commissionService.findAllForRestaurant(restaurantId) };
  }

  @Post("commission-rules")
  @RequirePermissions("commission:manage")
  async createRule(@Body() dto: CreateCommissionRuleDto, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Commission rule created", data: await this.commissionService.createRule(dto, admin.userId) };
  }

  @Patch("commission-rules/:id")
  @RequirePermissions("commission:manage")
  async updateRule(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCommissionRuleDto) {
    return { message: "Commission rule updated", data: await this.commissionService.updateRule(id, dto) };
  }

  @Get("restaurants/:id/commission")
  @RequirePermissions("commission:read")
  async getEffectiveCommission(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Effective commission fetched", data: await this.commissionService.getEffectiveCommission(id) };
  }

  @Post("restaurants/:id/commission/preview")
  @RequirePermissions("commission:read")
  async previewCommission(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CalculatePreviewDto) {
    return { message: "Commission preview calculated", data: await this.commissionService.calculateCommission(id, dto.amount) };
  }
}
