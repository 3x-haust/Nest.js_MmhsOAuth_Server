import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  nickname: string;

  @Column({ type: 'enum', enum: ['student', 'teacher'] })
  role: 'student' | 'teacher';

  @Column({ type: 'enum', enum: ['software', 'design', 'web'] })
  major: 'software' | 'design' | 'web';

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  generation: number;

  @Column({ nullable: true })
  admission: number;

  @Column({ nullable: true })
  isGraduated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
