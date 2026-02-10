import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationImplementation1770722450227 implements MigrationInterface {
    name = 'NotificationImplementation1770722450227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('announcement', 'welcome', 'password_change', 'profile_update', 'points_earned', 'transaction_success', 'transaction_failed', 'reminder', 'security_alert')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'announcement', "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "fcmToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastFailedLogin" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_4f0fcdb2ec356e6b03f13a3c40b" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_4f0fcdb2ec356e6b03f13a3c40b"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastFailedLogin"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fcmToken"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
