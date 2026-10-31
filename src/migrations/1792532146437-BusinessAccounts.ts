import { MigrationInterface, QueryRunner } from 'typeorm'

export class BusinessAccounts1792532146437 implements MigrationInterface {
  name = 'BusinessAccounts1792532146437'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."business_profiles_industry_enum" AS ENUM('hospitality', 'retail', 'manufacturing', 'office', 'estate', 'education', 'healthcare', 'events', 'other')`,
    )
    await queryRunner.query(
      `CREATE TABLE "business_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyName" character varying NOT NULL, "industry" "public"."business_profiles_industry_enum" NOT NULL, "cacNumber" character varying, "address" character varying NOT NULL, "city" character varying NOT NULL, "contactRole" character varying, "wasteTypes" text NOT NULL, "estimatedMonthlyKg" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "userEmail" character varying NOT NULL, CONSTRAINT "REL_7ec2fa17a0314096b42b264573" UNIQUE ("userId", "userEmail"), CONSTRAINT "PK_29525485b1db8e87caf6a5ef042" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'superadmin', 'business')`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    )
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`)
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD CONSTRAINT "FK_7ec2fa17a0314096b42b2645736" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP CONSTRAINT "FK_7ec2fa17a0314096b42b2645736"`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('user', 'admin', 'superadmin')`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    )
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    )
    await queryRunner.query(`DROP TABLE "business_profiles"`)
    await queryRunner.query(
      `DROP TYPE "public"."business_profiles_industry_enum"`,
    )
  }
}
