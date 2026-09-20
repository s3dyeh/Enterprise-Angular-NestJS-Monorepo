import { Injectable } from '@nestjs/common';

import { FileRepository } from './persistence/file.repository';
import { StoredFile } from './domain/file';
import { NullableType } from '../utils/types/nullable.type';

@Injectable()
export class FilesService {
  constructor(private readonly fileRepository: FileRepository) {}

  findById(id: StoredFile['id']): Promise<NullableType<StoredFile>> {
    return this.fileRepository.findById(id);
  }
}
