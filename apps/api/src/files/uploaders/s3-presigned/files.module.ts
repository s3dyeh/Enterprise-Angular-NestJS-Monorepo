import { Module } from '@nestjs/common';
import { FilesS3PresignedController } from './files.controller';
import { FilesS3PresignedService } from './files.service';
import { FilesPersistenceModule } from '../../persistence/files-persistence.module';
@Module({
  imports: [FilesPersistenceModule],
  controllers: [FilesS3PresignedController],
  providers: [FilesS3PresignedService],
  exports: [FilesS3PresignedService],
})
export class FilesS3PresignedModule {}
