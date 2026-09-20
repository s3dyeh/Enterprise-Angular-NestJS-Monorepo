import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('regions')
export class RegionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;
}
