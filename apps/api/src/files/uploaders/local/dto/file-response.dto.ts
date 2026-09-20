import { ApiProperty } from '@nestjs/swagger';
import { StoredFile } from '../../../domain/file';

export class FileResponseDto {
  @ApiProperty({
    type: () => StoredFile,
  })
  file: StoredFile;
}
