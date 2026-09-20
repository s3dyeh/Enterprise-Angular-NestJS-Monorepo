import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { Repository } from 'typeorm';
import { FileRepository } from './file.repository';

import { FileMapper } from './file.mapper';
import { StoredFile } from '../domain/file';
import { NullableType } from '../../utils/types/nullable.type';

@Injectable()
export class TypeOrmFileRepository implements FileRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async create(data: StoredFile): Promise<StoredFile> {
    const persistenceModel = FileMapper.toPersistence(data);
    const entity = await this.fileRepository.save(
      this.fileRepository.create(persistenceModel),
    );

    return FileMapper.toDomain(entity);
  }

  async findById(id: StoredFile['id']): Promise<NullableType<StoredFile>> {
    const entity = await this.fileRepository.findOne({
      where: {
        id: id,
      },
    });

    return entity ? FileMapper.toDomain(entity) : null;
  }
}
