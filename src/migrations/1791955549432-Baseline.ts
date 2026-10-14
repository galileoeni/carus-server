import { MigrationInterface, QueryRunner } from 'typeorm'

export class Baseline1791955549432 implements MigrationInterface {
  name = 'Baseline1791955549432'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `CREATE TYPE "public"."donations_status_enum" AS ENUM('pending', 'active', 'completed')`,
    )
    await queryRunner.query(
      `CREATE TABLE "donations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "target" numeric(10,2) NOT NULL DEFAULT '0', "duration" TIMESTAMP NOT NULL, "image" character varying, "status" "public"."donations_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c01355d6f6f50fc6d1b4a946abf" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."redemptions_type_enum" AS ENUM('airtime', 'cash')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'fulfilled', 'cancelled', 'declined', 'approved', 'paid')`,
    )
    await queryRunner.query(
      `CREATE TABLE "redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."redemptions_type_enum" NOT NULL, "points" numeric(10,2) NOT NULL, "network" character varying, "phoneNumber" character varying, "accountNumber" character varying, "bankName" character varying, "accountName" character varying, "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending', "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, CONSTRAINT "PK_def143ab94376fea5985bb04219" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_type_enum" AS ENUM('pickup', 'dropoff', 'donation', 'cash', 'airtime', 'giftcard')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_direction_enum" AS ENUM('credit', 'debit')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'fulfilled', 'cancelled', 'missed', 'completed')`,
    )
    await queryRunner.query(
      `CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."transaction_type_enum", "amount" numeric(10,2) NOT NULL DEFAULT '0', "direction" "public"."transaction_direction_enum", "charges" numeric(10,2) NOT NULL DEFAULT '0', "date" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending', "description" text, "userId" uuid, "userEmail" character varying, "walletId" uuid, CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_category_enum" AS ENUM('pickup', 'dropoff')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_material_enum" AS ENUM('plastic', 'paper', 'e-waste', 'organic', 'metal', 'glass', 'mixed-waste')`,
    )
    await queryRunner.query(
      `CREATE TABLE "schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" "public"."schedule_category_enum" NOT NULL DEFAULT 'pickup', "material" "public"."schedule_material_enum" NOT NULL DEFAULT 'plastic', "amount" numeric(10,2) NOT NULL DEFAULT '0', "material_amount" integer NOT NULL, "container_amount" integer NOT NULL, "address" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "status" character varying NOT NULL, "schedule_date" TIMESTAMP NOT NULL, "image" character varying, "transactionId" uuid, "userId" uuid, "userEmail" character varying, CONSTRAINT "REL_a409990e95d746630f49878179" UNIQUE ("transactionId"), CONSTRAINT "PK_1c05e42aec7371641193e180046" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'superadmin')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_admin_type_enum" AS ENUM('master', 'base')`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying NOT NULL, "last_name" character varying, "address" character varying, "region" character varying, "city" character varying, "phone" character varying, "email" character varying NOT NULL, "password" character varying, "username" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "admin_type" "public"."users_admin_type_enum", "avatar" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'INACTIVE', "gender" character varying, "dob" date, "otp" character varying, "otpExpires" character varying, "country_code" character varying NOT NULL DEFAULT '+234', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "googleId" character varying, "isGoogleUser" boolean NOT NULL DEFAULT false, "isDisabled" boolean NOT NULL DEFAULT false, "fcmToken" character varying, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "lastFailedLogin" TIMESTAMP, CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "PK_e752aee509d8f8118c6e5b1d8cc" PRIMARY KEY ("id", "email"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "contributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, "walletId" uuid, "donationId" uuid, CONSTRAINT "PK_ca2b4f39eb9e32a61278c711f79" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "wallet" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "points" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, CONSTRAINT "REL_843025588ded958efd71761885" UNIQUE ("userId", "userEmail"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."oxSchedule_category_enum" AS ENUM('pickup', 'dropoff')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."oxSchedule_material_enum" AS ENUM('plastic', 'paper', 'e-waste', 'organic', 'metal', 'glass', 'mixed-waste')`,
    )
    await queryRunner.query(
      `CREATE TABLE "oxSchedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "oxAddress" character varying NOT NULL, "category" "public"."oxSchedule_category_enum" NOT NULL DEFAULT 'pickup', "material" "public"."oxSchedule_material_enum" NOT NULL DEFAULT 'plastic', "amount" numeric(10,7) NOT NULL DEFAULT '0', "material_amount" integer NOT NULL, "container_amount" integer NOT NULL, "phone" character varying NOT NULL, "country_code" character varying NOT NULL, "address" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "status" character varying NOT NULL, "schedule_date" TIMESTAMP NOT NULL, "transactionId" uuid, CONSTRAINT "REL_a554c6144495367813334cd83c" UNIQUE ("transactionId"), CONSTRAINT "PK_99b93c25dae60777e654d3776eb" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "oxTransaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "amount" numeric(10,7) NOT NULL DEFAULT '0', "oxAddress" character varying NOT NULL, "charges" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL, "acceptedAt" TIMESTAMP, "fulfilledAt" TIMESTAMP, "cancelledAt" TIMESTAMP, "status" character varying NOT NULL DEFAULT 'pending', CONSTRAINT "PK_8ebe5fb9a3c2409adf771f153f0" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "oxLocations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying NOT NULL, "region" character varying NOT NULL, "state" character varying NOT NULL, "country" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a9bd717b2f7779948c87b330dad" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "notification_reads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "userEmail" character varying, "notificationId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c49ec541db45925cfb4e5c8dfbd" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('announcement', 'welcome', 'password_change', 'profile_update', 'points_earned', 'transaction_success', 'transaction_failed', 'reminder', 'security_alert', 'schedule')`,
    )
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'announcement', "isRead" boolean NOT NULL DEFAULT false, "userId" uuid, "userEmail" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."contact_status_enum" AS ENUM('open', 'in-progress', 'resolved')`,
    )
    await queryRunner.query(
      `CREATE TABLE "contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" character varying NOT NULL, "status" "public"."contact_status_enum" NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "userEmail" character varying, CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "configurations" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "value" character varying NOT NULL, CONSTRAINT "PK_ef9fc29709cc5fc66610fc6a664" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "redemptions" ADD CONSTRAINT "FK_c7a8f420593d5f4a9a2f81c70c5" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_503aff3fbe6e834e47d6f3d600a" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_900eb6b5efaecf57343e4c0e79d" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "schedule" ADD CONSTRAINT "FK_a409990e95d746630f498781790" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "schedule" ADD CONSTRAINT "FK_9ddb06c53d6b64a0a3bceb1ebbf" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD CONSTRAINT "FK_7868bacab8a5e1fd77d259d7c33" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD CONSTRAINT "FK_19833c4f9454a761843466062e8" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD CONSTRAINT "FK_2e5119db65c40e998de45051dc7" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "wallet" ADD CONSTRAINT "FK_843025588ded958efd71761885f" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "oxSchedule" ADD CONSTRAINT "FK_a554c6144495367813334cd83c7" FOREIGN KEY ("transactionId") REFERENCES "oxTransaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_e77c61d27f8ea70c2f234e18651" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "notification_reads" ADD CONSTRAINT "FK_38d077b9c1f597ae662c5ae4119" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_4f0fcdb2ec356e6b03f13a3c40b" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "contact" ADD CONSTRAINT "FK_045592128b1c957d4a8ba21ae92" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contact" DROP CONSTRAINT "FK_045592128b1c957d4a8ba21ae92"`,
    )
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_4f0fcdb2ec356e6b03f13a3c40b"`,
    )
    await queryRunner.query(
      `ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_38d077b9c1f597ae662c5ae4119"`,
    )
    await queryRunner.query(
      `ALTER TABLE "notification_reads" DROP CONSTRAINT "FK_e77c61d27f8ea70c2f234e18651"`,
    )
    await queryRunner.query(
      `ALTER TABLE "oxSchedule" DROP CONSTRAINT "FK_a554c6144495367813334cd83c7"`,
    )
    await queryRunner.query(
      `ALTER TABLE "wallet" DROP CONSTRAINT "FK_843025588ded958efd71761885f"`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" DROP CONSTRAINT "FK_2e5119db65c40e998de45051dc7"`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" DROP CONSTRAINT "FK_19833c4f9454a761843466062e8"`,
    )
    await queryRunner.query(
      `ALTER TABLE "contributions" DROP CONSTRAINT "FK_7868bacab8a5e1fd77d259d7c33"`,
    )
    await queryRunner.query(
      `ALTER TABLE "schedule" DROP CONSTRAINT "FK_9ddb06c53d6b64a0a3bceb1ebbf"`,
    )
    await queryRunner.query(
      `ALTER TABLE "schedule" DROP CONSTRAINT "FK_a409990e95d746630f498781790"`,
    )
    await queryRunner.query(
      `ALTER TABLE "transaction" DROP CONSTRAINT "FK_900eb6b5efaecf57343e4c0e79d"`,
    )
    await queryRunner.query(
      `ALTER TABLE "transaction" DROP CONSTRAINT "FK_503aff3fbe6e834e47d6f3d600a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "redemptions" DROP CONSTRAINT "FK_c7a8f420593d5f4a9a2f81c70c5"`,
    )
    await queryRunner.query(`DROP TABLE "configurations"`)
    await queryRunner.query(`DROP TABLE "contact"`)
    await queryRunner.query(`DROP TYPE "public"."contact_status_enum"`)
    await queryRunner.query(`DROP TABLE "notifications"`)
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`)
    await queryRunner.query(`DROP TABLE "notification_reads"`)
    await queryRunner.query(`DROP TABLE "oxLocations"`)
    await queryRunner.query(`DROP TABLE "oxTransaction"`)
    await queryRunner.query(`DROP TABLE "oxSchedule"`)
    await queryRunner.query(`DROP TYPE "public"."oxSchedule_material_enum"`)
    await queryRunner.query(`DROP TYPE "public"."oxSchedule_category_enum"`)
    await queryRunner.query(`DROP TABLE "wallet"`)
    await queryRunner.query(`DROP TABLE "contributions"`)
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TYPE "public"."users_admin_type_enum"`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
    await queryRunner.query(`DROP TABLE "schedule"`)
    await queryRunner.query(`DROP TYPE "public"."schedule_material_enum"`)
    await queryRunner.query(`DROP TYPE "public"."schedule_category_enum"`)
    await queryRunner.query(`DROP TABLE "transaction"`)
    await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."transaction_direction_enum"`)
    await queryRunner.query(`DROP TYPE "public"."transaction_type_enum"`)
    await queryRunner.query(`DROP TABLE "redemptions"`)
    await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."redemptions_type_enum"`)
    await queryRunner.query(`DROP TABLE "donations"`)
    await queryRunner.query(`DROP TYPE "public"."donations_status_enum"`)
  }
}
