import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowNullableLName1769243371379 implements MigrationInterface {
    name = 'AllowNullableLName1769243371379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL`);
    }

}
