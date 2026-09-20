import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('currencies')
export class CurrencyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 12 })
  symbol: string;
}
