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

@Entity('login_unblock_requests')
@Index('login_unblock_pending_key', ['key'], {
  unique: true,
  where: 'completed_at IS NULL',
})
export class LoginUnblockRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 64 }) key: string;
  @Column() actor_id: number;
  @Column({ type: 'uuid', nullable: true }) block_generation: string | null;
  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: UserEntity;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date | null;
}
