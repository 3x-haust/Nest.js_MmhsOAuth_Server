import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSearchHistoryTable202603111200001741680000000
  implements MigrationInterface
{
  name = 'CreateUserSearchHistoryTable202603111200001741680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_search_history" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "targetUserId" integer NOT NULL,
        "searchedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_search_history_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_search_history_user_target"
      ON "user_search_history" ("userId", "targetUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_search_history_user_searchedAt"
      ON "user_search_history" ("userId", "searchedAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_search_history"
      ADD CONSTRAINT "FK_user_search_history_userId_user_id"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_search_history"
      ADD CONSTRAINT "FK_user_search_history_targetUserId_user_id"
      FOREIGN KEY ("targetUserId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_search_history" DROP CONSTRAINT "FK_user_search_history_targetUserId_user_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_search_history" DROP CONSTRAINT "FK_user_search_history_userId_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_user_search_history_user_searchedAt"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."UQ_user_search_history_user_target"',
    );
    await queryRunner.query('DROP TABLE "user_search_history"');
  }
}
