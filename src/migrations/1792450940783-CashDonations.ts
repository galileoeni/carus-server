import { MigrationInterface, QueryRunner } from 'typeorm'

export class CashDonations1792450940783 implements MigrationInterface {
  name = 'CashDonations1792450940783'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."donation_payments_status_enum" AS ENUM('pending', 'success', 'failed')`,
    )
    await queryRunner.query(
      `CREATE TABLE "donation_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "amount" numeric(12,2) NOT NULL, "donorName" character varying NOT NULL, "donorEmail" character varying NOT NULL, "status" "public"."donation_payments_status_enum" NOT NULL DEFAULT 'pending', "channel" character varying, "paidAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "donationId" uuid NOT NULL, "userId" uuid, "userEmail" character varying, "contributionId" uuid, CONSTRAINT "UQ_f1c8fb44592edc3d1b6a1c3da12" UNIQUE ("reference"), CONSTRAINT "REL_725dbf4733c6d89b826a1afb8a" UNIQUE ("contributionId"), CONSTRAINT "PK_2d335742967df82db7faef1a8b5" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD "source" character varying NOT NULL DEFAULT 'points'`,
    )
    await queryRunner.query(
      `ALTER TABLE "donation_payments" ADD CONSTRAINT "FK_c7918f80b0b7781a210c18a7920" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "donation_payments" ADD CONSTRAINT "FK_1ae79cc8d3dbef0e827fcedc4b3" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "donation_payments" ADD CONSTRAINT "FK_725dbf4733c6d89b826a1afb8af" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation_payments" DROP CONSTRAINT "FK_725dbf4733c6d89b826a1afb8af"`,
    )
    await queryRunner.query(
      `ALTER TABLE "donation_payments" DROP CONSTRAINT "FK_1ae79cc8d3dbef0e827fcedc4b3"`,
    )
    await queryRunner.query(
      `ALTER TABLE "donation_payments" DROP CONSTRAINT "FK_c7918f80b0b7781a210c18a7920"`,
    )
    await queryRunner.query(`ALTER TABLE "contributions" DROP COLUMN "source"`)
    await queryRunner.query(`DROP TABLE "donation_payments"`)
    await queryRunner.query(
      `DROP TYPE "public"."donation_payments_status_enum"`,
    )
  }
}
