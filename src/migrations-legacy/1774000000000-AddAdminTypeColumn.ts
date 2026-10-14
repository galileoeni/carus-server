import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminTypeColumn1774000000000 implements MigrationInterface {
  name = 'AddAdminTypeColumn1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add admin_type column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "admin_type" character varying(20)
    `);

    // Create enum type for admin_type
    await queryRunner.query(`
      CREATE TYPE "admin_type_enum" AS ENUM ('master', 'base')
    `);

    // Update the column to use the enum type
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "admin_type" TYPE "admin_type_enum"
      USING "admin_type"::"admin_type_enum"
    `);

    // Set default value for existing admins to 'base'
    await queryRunner.query(`
      UPDATE "users"
      SET "admin_type" = 'base'
      WHERE "role" IN ('admin', 'superadmin')
    `);

    // Make the column nullable for now (can be made NOT NULL later after data migration)
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "admin_type" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the admin_type column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "admin_type"
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "admin_type_enum"
    `);
  }
}