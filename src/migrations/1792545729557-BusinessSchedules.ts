import { MigrationInterface, QueryRunner } from 'typeorm'

export class BusinessSchedules1792545729557 implements MigrationInterface {
  name = 'BusinessSchedules1792545729557'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."business_schedule_plans_frequency_enum" AS ENUM('weekly', 'biweekly', 'monthly', 'flexible')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."business_schedule_plans_window_enum" AS ENUM('morning', 'afternoon')`,
    )
    await queryRunner.query(
      `CREATE TABLE "business_schedule_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "frequency" "public"."business_schedule_plans_frequency_enum" NOT NULL, "dayOfWeek" integer, "dayOfMonth" integer, "window" "public"."business_schedule_plans_window_enum" NOT NULL DEFAULT 'morning', "startDate" date NOT NULL, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "businessId" uuid NOT NULL, "businessEmail" character varying NOT NULL, CONSTRAINT "REL_0e7aca1d112e8e263c9bdd5e2f" UNIQUE ("businessId", "businessEmail"), CONSTRAINT "PK_dc0eb8fcf20a8f1e9880d49853d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."business_pickups_window_enum" AS ENUM('morning', 'afternoon')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."business_pickups_kind_enum" AS ENUM('scheduled', 'quick')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."business_pickups_status_enum" AS ENUM('requested', 'scheduled', 'completed', 'missed', 'cancelled', 'declined')`,
    )
    await queryRunner.query(
      `CREATE TABLE "business_pickups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "window" "public"."business_pickups_window_enum" NOT NULL DEFAULT 'morning', "kind" "public"."business_pickups_kind_enum" NOT NULL, "status" "public"."business_pickups_status_enum" NOT NULL, "fromPlan" boolean NOT NULL DEFAULT false, "requestNote" text, "adminNote" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "businessId" uuid NOT NULL, "businessEmail" character varying NOT NULL, CONSTRAINT "PK_088ac50a497768714e1a1b24b8d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_business_pickups_plan_date" ON "business_pickups" ("businessId", "businessEmail", "date") WHERE "fromPlan" = true`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_ddcbc74f334e9bef33c121c653" ON "business_pickups" ("businessId", "businessEmail", "date") `,
    )
    await queryRunner.query(
      `ALTER TABLE "business_schedule_plans" ADD CONSTRAINT "FK_0e7aca1d112e8e263c9bdd5e2fa" FOREIGN KEY ("businessId", "businessEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_pickups" ADD CONSTRAINT "FK_26c4ece8e7028e3fbf0d20a2860" FOREIGN KEY ("businessId", "businessEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_pickups" DROP CONSTRAINT "FK_26c4ece8e7028e3fbf0d20a2860"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_schedule_plans" DROP CONSTRAINT "FK_0e7aca1d112e8e263c9bdd5e2fa"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ddcbc74f334e9bef33c121c653"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."UQ_business_pickups_plan_date"`,
    )
    await queryRunner.query(`DROP TABLE "business_pickups"`)
    await queryRunner.query(`DROP TYPE "public"."business_pickups_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."business_pickups_kind_enum"`)
    await queryRunner.query(`DROP TYPE "public"."business_pickups_window_enum"`)
    await queryRunner.query(`DROP TABLE "business_schedule_plans"`)
    await queryRunner.query(
      `DROP TYPE "public"."business_schedule_plans_window_enum"`,
    )
    await queryRunner.query(
      `DROP TYPE "public"."business_schedule_plans_frequency_enum"`,
    )
  }
}
