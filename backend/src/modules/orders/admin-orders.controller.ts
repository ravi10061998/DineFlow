import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { OrdersService } from "./orders.service";

@ApiTags("Admin - Orders")
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions("orders:read")
  async list() {
    return { message: "Orders fetched", data: await this.ordersService.findAllForAdmin() };
  }

  @Get(":id")
  @RequirePermissions("orders:read")
  async getOne(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Order fetched", data: await this.ordersService.findOneOrThrow(id) };
  }
}
