import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RegionEntity } from './region.entity';

@Entity('cities')
@Unique(['name', 'region_id'])
@Index('cities_region_idx', ['region_id', 'id'])
export class CityEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column()
  region_id: number;

  @ManyToOne(() => RegionEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region: RegionEntity;
}
