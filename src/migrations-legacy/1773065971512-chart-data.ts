import { MigrationInterface, QueryRunner } from "typeorm";

export class ChartData1773065971512 implements MigrationInterface {
    name = 'ChartData1773065971512'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_notification_reads_notification"`);
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_notification_reads_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notification_reads_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notification_reads_notification"`);
        await queryRunner.query(`CREATE TYPE "public"."donations_status_enum" AS ENUM('pending', 'active', 'completed')`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "status" "public"."donations_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_e77c61d27f8ea70c2f234e18651" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_38d077b9c1f597ae662c5ae4119" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_38d077b9c1f597ae662c5ae4119"`);
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_e77c61d27f8ea70c2f234e18651"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."donations_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_reads_notification" ON "notification_reads" ("notificationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_reads_user" ON "notification_reads" ("userEmail", "userId") `);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_notification_reads_user" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_notification_reads_notification" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
