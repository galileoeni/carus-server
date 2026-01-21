import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1768993434749 implements MigrationInterface {
    name = 'Init1768993434749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "updatedAt" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "createdAt" DROP DEFAULT`);
    }

}
