import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/persistence/user.entity';
import { CurrencyEntity } from './currency.entity';

@Entity('account_credits')
@Unique(['account_id', 'currency_id'])
export class AccountCreditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_id: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'account_id' })
  account: UserEntity;

  @Column()
  currency_id: number;

  @ManyToOne(() => CurrencyEntity, { nullable: false })
  @JoinColumn({ name: 'currency_id' })
  currency: CurrencyEntity;

  // PostgreSQL numeric values stay strings to avoid floating-point precision loss.
  @Column({ type: 'numeric', precision: 20, scale: 4, default: 0 })
  balance: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
