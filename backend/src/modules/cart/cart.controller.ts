import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { CartService } from "./cart.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@ApiTags("Customer Self-Service - Cart")
@UseGuards(CustomerGuard)
@Controller("customer/me/cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Cart fetched", data: await this.cartService.getCart(user.userId) };
  }

  @Post()
  async addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return { message: "Item added to cart", data: await this.cartService.addItem(user.userId, dto) };
  }

  @Patch(":id")
  async updateQuantity(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCartItemDto) {
    return { message: "Cart item updated", data: await this.cartService.updateQuantity(id, user.userId, dto.quantity) };
  }

  @Delete(":id")
  async removeItem(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Item removed from cart", data: await this.cartService.removeItem(id, user.userId) };
  }

  @Delete()
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    await this.cartService.clearCart(user.userId);
    return { message: "Cart cleared", data: null };
  }
}
