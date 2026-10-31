import { MigrationInterface, QueryRunner } from 'typeorm'

export class PickupCollections1792547555987 implements MigrationInterface {
  name = 'PickupCollections1792547555987'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."business_pickup_items_material_enum" AS ENUM('plastic', 'paper', 'e-waste', 'organic', 'metal', 'glass', 'mixed-waste')`,
    )
    await queryRunner.query(
      `CREATE TABLE "business_pickup_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "material" "public"."business_pickup_items_material_enum" NOT NULL, "weightKg" numeric(10,1) NOT NULL, "pickupId" uuid NOT NULL, CONSTRAINT "PK_ceee3947c0e55331b2099950aea" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" ADD "collectedAt" TIMESTAMP`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" ADD "totalWeightKg" numeric(10,1)`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" ADD "photos" jsonb NOT NULL DEFAULT '[]'`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickup_items" ADD CONSTRAINT "FK_d522d1a7e8de44b37a0cba64a3b" FOREIGN KEY ("pickupId") REFERENCES "business_pickups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_pickup_items" DROP CONSTRAINT "FK_d522d1a7e8de44b37a0cba64a3b"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" DROP COLUMN "photos"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" DROP COLUMN "totalWeightKg"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" DROP COLUMN "collectedAt"`,
    )
    await queryRunner.query(`DROP TABLE "business_pickup_items"`)
    await queryRunner.query(
      `DROP TYPE "public"."business_pickup_items_material_enum"`,
    )
  }
}
