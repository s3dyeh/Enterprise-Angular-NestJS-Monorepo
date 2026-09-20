import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { FileRepository } from './file.repository';
import { TypeOrmFileRepository } from './typeorm-file.repository';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  providers: [
    {
      provide: FileRepository,
      useClass: TypeOrmFileRepository,
    },
  ],
  exports: [FileRepository],
})
export class FilesPersistenceModule {}
