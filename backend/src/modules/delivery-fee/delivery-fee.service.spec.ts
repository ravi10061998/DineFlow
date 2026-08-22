import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeliveryFeeService } from "./delivery-fee.service";
import { DeliveryFeeSettings } from "./entities/delivery-fee-settings.entity";

describe("DeliveryFeeService", () => {
  let service: DeliveryFeeService;
  let settingsRepo: { find: jest.Mock; save: jest.Mock };

  const settings = { id: "s1", baseFee: "20.00", perKmRate: "8.00", freeDeliveryAboveAmount: "500.00" };

  beforeEach(async () => {
    settingsRepo = { find: jest.fn().mockResolvedValue([{ ...settings }]), save: jest.fn(async (x) => x) };

    const moduleRef = await Test.createTestingModule({
      providers: [DeliveryFeeService, { provide: getRepositoryToken(DeliveryFeeSettings), useValue: settingsRepo }],
    }).compile();

    service = moduleRef.get(DeliveryFeeService);
  });

  describe("calculate", () => {
    it("falls back to a flat base fee when either side lacks coordinates", async () => {
      const result = await service.calculate({ restaurantLat: null, restaurantLng: null, addressLat: "12.9", addressLng: "77.5", subtotal: 100 });

      expect(result).toEqual({ fee: "20.00", distanceKm: null });
    });

    it("computes baseFee + perKmRate × real distance when both sides have coordinates", async () => {
      // Roughly 3.13km apart (Bengaluru city-center-ish points)
      const result = await service.calculate({ restaurantLat: "12.9716", restaurantLng: "77.5946", addressLat: "13.00", addressLng: "77.60", subtotal: 100 });

      expect(result.distanceKm).toBeGreaterThan(0);
      // distanceKm in the result is rounded to 1 decimal for display; the fee itself is computed
      // from the unrounded distance, so allow a small tolerance rather than an exact match.
      expect(Number(result.fee)).toBeCloseTo(20 + result.distanceKm! * 8, 0);
    });

    it("waives the fee entirely once the subtotal reaches the free-delivery threshold", async () => {
      const result = await service.calculate({ restaurantLat: "12.9716", restaurantLng: "77.5946", addressLat: "13.00", addressLng: "77.60", subtotal: 500 });

      expect(result).toEqual({ fee: "0.00", distanceKm: null });
    });

    it("never waives when there's no free-delivery threshold configured", async () => {
      settingsRepo.find.mockResolvedValue([{ ...settings, freeDeliveryAboveAmount: null }]);

      const result = await service.calculate({ restaurantLat: null, restaurantLng: null, addressLat: null, addressLng: null, subtotal: 999999 });

      expect(result).toEqual({ fee: "20.00", distanceKm: null });
    });
  });

  describe("updateSettings", () => {
    it("updates only the fields provided", async () => {
      const result = await service.updateSettings({ baseFee: 25 });

      expect(result.baseFee).toBe("25.00");
      expect(result.perKmRate).toBe("8.00");
    });

    it("clears the free-delivery threshold when explicitly passed null", async () => {
      const result = await service.updateSettings({ freeDeliveryAboveAmount: null });

      expect(result.freeDeliveryAboveAmount).toBeNull();
    });
  });
});
