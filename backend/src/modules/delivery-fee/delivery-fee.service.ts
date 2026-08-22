import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryFeeSettings } from "./entities/delivery-fee-settings.entity";
import { UpdateDeliveryFeeSettingsDto } from "./dto/update-delivery-fee-settings.dto";

export interface DeliveryFeeCalculation {
  fee: string;
  distanceKm: number | null;
}

@Injectable()
export class DeliveryFeeService {
  constructor(@InjectRepository(DeliveryFeeSettings) private readonly settingsRepository: Repository<DeliveryFeeSettings>) {}

  async getSettings(): Promise<DeliveryFeeSettings> {
    const [settings] = await this.settingsRepository.find({ order: { createdAt: "ASC" }, take: 1 });
    if (!settings) {
      throw new NotFoundException("Delivery fee settings have not been seeded — run migrations.");
    }
    return settings;
  }

  async updateSettings(dto: UpdateDeliveryFeeSettingsDto): Promise<DeliveryFeeSettings> {
    const settings = await this.getSettings();
    if (dto.baseFee !== undefined) settings.baseFee = dto.baseFee.toFixed(2);
    if (dto.perKmRate !== undefined) settings.perKmRate = dto.perKmRate.toFixed(2);
    if (dto.freeDeliveryAboveAmount !== undefined) {
      settings.freeDeliveryAboveAmount = dto.freeDeliveryAboveAmount === null ? null : dto.freeDeliveryAboveAmount.toFixed(2);
    }
    return this.settingsRepository.save(settings);
  }

  /**
   * baseFee + perKmRate × distance when both restaurant and delivery address have coordinates;
   * falls back to a flat baseFee (distanceKm: null) otherwise — never fabricates a distance from
   * nothing. Waived entirely once the order subtotal reaches the configured free-delivery threshold.
   */
  async calculate(params: {
    restaurantLat: string | null;
    restaurantLng: string | null;
    addressLat: string | null;
    addressLng: string | null;
    subtotal: number;
  }): Promise<DeliveryFeeCalculation> {
    const settings = await this.getSettings();

    if (settings.freeDeliveryAboveAmount !== null && params.subtotal >= Number(settings.freeDeliveryAboveAmount)) {
      return { fee: "0.00", distanceKm: null };
    }

    if (params.restaurantLat === null || params.restaurantLng === null || params.addressLat === null || params.addressLng === null) {
      return { fee: Number(settings.baseFee).toFixed(2), distanceKm: null };
    }

    const distanceKm = this.haversineKm(
      Number(params.restaurantLat),
      Number(params.restaurantLng),
      Number(params.addressLat),
      Number(params.addressLng),
    );
    const fee = Number(settings.baseFee) + distanceKm * Number(settings.perKmRate);
    return { fee: fee.toFixed(2), distanceKm: Math.round(distanceKm * 10) / 10 };
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
