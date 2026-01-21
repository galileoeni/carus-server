import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1768990221340 implements MigrationInterface {
    name = 'Init1768990221340'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "description"`);
    }

}
