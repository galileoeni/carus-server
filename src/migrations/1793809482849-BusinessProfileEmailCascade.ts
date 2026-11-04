import { MigrationInterface, QueryRunner } from 'typeorm'

export class BusinessProfileEmailCascade1793809482849
  implements MigrationInterface
{
  name = 'BusinessProfileEmailCascade1793809482849'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP CONSTRAINT "FK_7ec2fa17a0314096b42b2645736"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD CONSTRAINT "FK_7ec2fa17a0314096b42b2645736" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE CASCADE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP CONSTRAINT "FK_7ec2fa17a0314096b42b2645736"`,
    )
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD CONSTRAINT "FK_7ec2fa17a0314096b42b2645736" FOREIGN KEY ("userId", "userEmail") REFERENCES "users"("id","email") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }
}
