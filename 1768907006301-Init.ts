import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1768907006301 implements MigrationInterface {
    name = 'Init1768907006301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD "points" numeric(10,2) NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'paid', 'declined')`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN "points"`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD "amount" numeric(10,2) NOT NULL`);
    }

}
