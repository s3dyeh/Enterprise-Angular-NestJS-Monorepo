import { Module } from '@nestjs/common';
import { FilesPersistenceModule } from './persistence/files-persistence.module';
import { FilesService } from './files.service';
import fileConfig from './config/file.config';
import { FileConfig, FileDriver } from './config/file-config.type';
import { FilesLocalModule } from './uploaders/local/files.module';
import { FilesS3Module } from './uploaders/s3/files.module';
import { FilesS3PresignedModule } from './uploaders/s3-presigned/files.module';

const infrastructureUploaderModule =
  (fileConfig() as FileConfig).driver === FileDriver.LOCAL
    ? FilesLocalModule
    : (fileConfig() as FileConfig).driver === FileDriver.S3
      ? FilesS3Module
      : FilesS3PresignedModule;

@Module({
  imports: [FilesPersistenceModule, infrastructureUploaderModule],
  providers: [FilesService],
  exports: [FilesService, FilesPersistenceModule],
})
export class FilesModule {}
