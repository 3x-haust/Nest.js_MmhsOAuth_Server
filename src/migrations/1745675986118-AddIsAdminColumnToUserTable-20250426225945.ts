import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminColumnToUserTable202504262259451745675986118 implements MigrationInterface {
    name = 'AddIsAdminColumnToUserTable202504262259451745675986118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notices" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "userId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3eb18c29da25d6935fcbe584237" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_79364067097eea7912bb08855b6" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_79364067097eea7912bb08855b6"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdmin"`);
        await queryRunner.query(`DROP TABLE "notices"`);
    }

}
