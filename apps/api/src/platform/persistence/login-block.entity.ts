import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('login_blocks')
@Index('login_blocks_expiry_idx', ['locked_until'])
export class LoginBlockEntity {
  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  generation: string;
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column()
  attempts: number;

  @Column({ type: 'timestamptz' })
  locked_until: Date;
}
