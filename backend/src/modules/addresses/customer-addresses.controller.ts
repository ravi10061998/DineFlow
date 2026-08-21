import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { AddressesService } from "./addresses.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";

@ApiTags("Customer Self-Service - Addresses")
@UseGuards(CustomerGuard)
@Controller("customer/me/addresses")
export class CustomerAddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Addresses fetched", data: await this.addressesService.findAllForUser(user.userId) };
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Address fetched", data: await this.addressesService.findOneOrThrow(id, user.userId) };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return { message: "Address added", data: await this.addressesService.create(user.userId, dto) };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateAddressDto) {
    return { message: "Address updated", data: await this.addressesService.update(id, user.userId, dto) };
  }

  @Patch(":id/default")
  async setDefault(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Default address updated", data: await this.addressesService.setDefault(id, user.userId) };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.addressesService.remove(id, user.userId);
    return { message: "Address deleted", data: null };
  }
}
