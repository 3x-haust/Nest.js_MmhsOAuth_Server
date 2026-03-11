import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_search_history')
@Unique('UQ_user_search_history_user_target', ['userId', 'targetUserId'])
@Index('IDX_user_search_history_user_searchedAt', ['userId', 'searchedAt'])
export class UserSearchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  targetUserId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  searchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
