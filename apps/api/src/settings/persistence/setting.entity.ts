import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_settings')
export class SettingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  property: string;

  @Column({ length: 2000 })
  value: string;

  @Column({ length: 500, default: '' })
  description: string;
}
