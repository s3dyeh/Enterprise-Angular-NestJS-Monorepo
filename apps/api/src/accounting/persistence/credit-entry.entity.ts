import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/persistence/user.entity';
import { AccountCreditEntity } from './account-credit.entity';

@Entity('credit_entries')
@Check('amount <> 0')
@Index('credit_entries_account_idx', ['credit_id', 'created_at'])
export class CreditEntryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column()
  credit_id: number;

  @ManyToOne(() => AccountCreditEntity, { nullable: false })
  @JoinColumn({ name: 'credit_id' })
  credit: AccountCreditEntity;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  amount: string;

  @Column({ type: 'uuid', unique: true })
  idempotency_key: string;

  @Column({ length: 300 })
  reason: string;

  @Column()
  operator_id: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'operator_id' })
  operator: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
