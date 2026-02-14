import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationRead1770722450228 implements MigrationInterface {
    name = 'CreateNotificationRead1770722450228'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notification_reads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, "notificationId" uuid, CONSTRAINT "PK_notification_reads_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_reads_user" ON "notification_reads" ("userId", "userEmail")`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_reads_notification" ON "notification_reads" ("notificationId")`);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_notification_reads_user" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_notification_reads_notification" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_notification_reads_notification"`);
        await queryRunner.query(`ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_notification_reads_user"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_reads_notification"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_reads_user"`);
        await queryRunner.query(`DROP TABLE "notification_reads"`);
    }

}
