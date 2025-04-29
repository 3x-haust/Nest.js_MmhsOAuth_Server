import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PermissionStatus = 'active' | 'revoked';

@Entity('permission_history')
export class PermissionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  clientId: string;

  @Column()
  applicationName: string;

  @Column()
  applicationDomain: string;

  @Column()
  permissionScopes: string;

  @Column()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'revoked'],
    default: 'active',
  })
  status: PermissionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
