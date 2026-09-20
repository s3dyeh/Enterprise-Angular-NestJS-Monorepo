import { NullableType } from '../../utils/types/nullable.type';
import { StoredFile } from '../domain/file';

export abstract class FileRepository {
  abstract create(data: Omit<StoredFile, 'id'>): Promise<StoredFile>;

  abstract findById(id: StoredFile['id']): Promise<NullableType<StoredFile>>;
}
