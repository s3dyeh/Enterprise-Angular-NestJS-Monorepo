import { Global, Module } from '@nestjs/common';
import { AdminMutationService } from './admin-mutation.service';
import { AdminStore } from './admin-store.service';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  providers: [AdminStore, AdminMutationService, PermissionGuard],
  exports: [AdminStore, AdminMutationService, PermissionGuard],
})
export class AdminCoreModule {}
