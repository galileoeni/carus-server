import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1769043986088 implements MigrationInterface {
    name = 'Init1769043986088'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transaction_direction_enum" AS ENUM('credit', 'debit')`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "direction" "public"."transaction_direction_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."redemptions_status_enum" RENAME TO "redemptions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'fulfilled', 'cancelled', 'declined', 'approved', 'paid')`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" TYPE "public"."redemptions_status_enum" USING "status"::"text"::"public"."redemptions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "type"`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_type_enum" AS ENUM('pickup', 'dropoff', 'donation', 'cash', 'airtime', 'giftcard')`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "type" "public"."transaction_type_enum"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'fulfilled', 'cancelled', 'missed', 'completed')`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "status" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_type_enum"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "type" character varying NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum_old" AS ENUM('declined', 'paid', 'pending')`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" TYPE "public"."redemptions_status_enum_old" USING "status"::"text"::"public"."redemptions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "redemptions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."redemptions_status_enum_old" RENAME TO "redemptions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "direction"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_direction_enum"`);
    }

}
