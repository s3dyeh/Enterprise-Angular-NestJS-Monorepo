import { StoredFile } from '../domain/file';
import { FileEntity } from './file.entity';

export class FileMapper {
  static toDomain(raw: FileEntity): StoredFile {
    const domainEntity = new StoredFile();
    domainEntity.id = raw.id;
    domainEntity.path = raw.path;
    return domainEntity;
  }

  static toPersistence(domainEntity: StoredFile): FileEntity {
    const persistenceEntity = new FileEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.path = domainEntity.path;
    return persistenceEntity;
  }
}
