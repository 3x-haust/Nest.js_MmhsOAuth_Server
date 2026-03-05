import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeveloperDocsTable202603060400001741245600000
  implements MigrationInterface
{
  name = 'CreateDeveloperDocsTable202603060400001741245600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "developer_docs" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "isPublished" boolean NOT NULL DEFAULT true,
        "userId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_developer_docs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "developer_docs"
      ADD CONSTRAINT "FK_developer_docs_userId_user_id"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "developer_docs" DROP CONSTRAINT "FK_developer_docs_userId_user_id"',
    );
    await queryRunner.query('DROP TABLE "developer_docs"');
  }
}
