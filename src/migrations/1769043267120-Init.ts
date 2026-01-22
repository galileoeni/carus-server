import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1769043267120 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "redemptions_status_enum"
      ADD VALUE IF NOT EXISTS 'declined'
    `)

    await queryRunner.query(`
  ALTER TYPE "redemptions_status_enum"
  ADD VALUE IF NOT EXISTS 'paid'
`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
