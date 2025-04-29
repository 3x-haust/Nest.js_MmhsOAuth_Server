import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminColumnToUserTable202504291057521745891873233 implements MigrationInterface {
    name = 'AddIsAdminColumnToUserTable202504291057521745891873233'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."permission_history_status_enum" AS ENUM('active', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "permission_history" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "clientId" character varying NOT NULL, "applicationName" character varying NOT NULL, "applicationDomain" character varying NOT NULL, "permissionScopes" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "status" "public"."permission_history_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_90a42e4dac5199a2ada08d233f7" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "permission_history"`);
        await queryRunner.query(`DROP TYPE "public"."permission_history_status_enum"`);
    }

}
