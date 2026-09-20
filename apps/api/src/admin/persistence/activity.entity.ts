import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/persistence/user.entity';

@Entity('activities')
@Index('activities_created_idx', { synchronize: false })
export class ActivityEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'integer', nullable: true })
  operator_id: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'operator_id' })
  operator: UserEntity | null;

  @Column({ length: 100 })
  event: string;

  @Column({ length: 200 })
  uri: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
