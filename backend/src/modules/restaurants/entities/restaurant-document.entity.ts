import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "./restaurant.entity";

export enum RestaurantDocumentType {
  FSSAI_LICENSE = "FSSAI_LICENSE",
  GST_CERTIFICATE = "GST_CERTIFICATE",
  PAN_CARD = "PAN_CARD",
  BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION",
  BANK_PROOF = "BANK_PROOF",
  OTHER = "OTHER",
}

export enum RestaurantDocumentStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

@Entity({ name: "restaurant_documents" })
export class RestaurantDocument extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "enum", enum: RestaurantDocumentType })
  type!: RestaurantDocumentType;

  /** Path on local disk relative to backend/uploads — never served via static hosting, only the authenticated file route. */
  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath!: string;

  @Column({ name: "original_file_name", type: "varchar", length: 255 })
  originalFileName!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "file_size_bytes", type: "integer" })
  fileSizeBytes!: number;

  @Column({ type: "enum", enum: RestaurantDocumentStatus, default: RestaurantDocumentStatus.PENDING })
  status!: RestaurantDocumentStatus;

  @Column({ name: "rejection_reason", type: "varchar", length: 500, nullable: true })
  rejectionReason!: string | null;

  @Column({ name: "uploaded_by_user_id", type: "uuid" })
  uploadedByUserId!: string;
}
