import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AllowedUserType = 'all' | 'student' | 'teacher';

@Entity()
export class OAuthClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  clientId: string;

  @Column()
  userId: number;

  @Column()
  clientSecret: string;

  @Column({ unique: true })
  serviceDomain: string;

  @Column({ unique: true })
  serviceName: string;

  @Column()
  scope: string;

  @Column({ type: 'enum', enum: ['all', 'student', 'teacher'], default: 'all' })
  allowedUserType: AllowedUserType;

  @Column('text', { array: true, nullable: true })
  redirectUris: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
