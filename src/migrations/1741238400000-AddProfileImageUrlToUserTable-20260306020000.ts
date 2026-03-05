import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileImageUrlToUserTable202603060200001741238400000
  implements MigrationInterface
{
  name = 'AddProfileImageUrlToUserTable202603060200001741238400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user" ADD "profileImageUrl" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user" DROP COLUMN "profileImageUrl"');
  }
}
