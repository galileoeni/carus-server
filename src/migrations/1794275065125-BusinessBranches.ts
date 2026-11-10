import { MigrationInterface, QueryRunner } from 'typeorm'

export class BusinessBranches1794275065125 implements MigrationInterface {
  name = 'BusinessBranches1794275065125'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "business_branch_invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "branchName" character varying, "expiresAt" TIMESTAMP NOT NULL, "usedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "parentId" uuid NOT NULL, "branchId" uuid, CONSTRAINT "PK_98c8925c6f8596ba209073f9eb3" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e805aecbb8a84306f034737c7c" ON "business_branch_invites" ("token") `,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD "branchName" character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD "parentId" uuid`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD CONSTRAINT "FK_5a20ebe3250a0a3b8645dee005a" FOREIGN KEY ("parentId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_branch_invites" ADD CONSTRAINT "FK_49b7e6e0885daf0d9cc78883208" FOREIGN KEY ("parentId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_branch_invites" ADD CONSTRAINT "FK_f8e70b83b6de0ed13660e2990ec" FOREIGN KEY ("branchId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_branch_invites" DROP CONSTRAINT "FK_f8e70b83b6de0ed13660e2990ec"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_branch_invites" DROP CONSTRAINT "FK_49b7e6e0885daf0d9cc78883208"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP CONSTRAINT "FK_5a20ebe3250a0a3b8645dee005a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP COLUMN "parentId"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP COLUMN "branchName"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e805aecbb8a84306f034737c7c"`,
    )
    await queryRunner.query(`DROP TABLE "business_branch_invites"`)
  }
}
