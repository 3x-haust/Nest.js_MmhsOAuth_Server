import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalEmailToUserTable202606251200001782370000000
  implements MigrationInterface
{
  name = 'AddPersonalEmailToUserTable202606251200001782370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user" ADD "personalEmail" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "user" ADD "personalEmailVerifiedAt" TIMESTAMP',
    );
    await queryRunner.query(
      'ALTER TABLE "user" ADD CONSTRAINT "UQ_user_personalEmail" UNIQUE ("personalEmail")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user" DROP CONSTRAINT "UQ_user_personalEmail"',
    );
    await queryRunner.query(
      'ALTER TABLE "user" DROP COLUMN "personalEmailVerifiedAt"',
    );
    await queryRunner.query('ALTER TABLE "user" DROP COLUMN "personalEmail"');
  }
}
