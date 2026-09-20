import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { Role } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoPipe } from '@jsverse/transloco';
import { createListPage } from '@app/shared/crud/list-page';
import { ListStateComponent } from '@app/shared/crud/list-state.component';
import { RoleDialogComponent } from './role-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    ListToolbarComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    TranslocoPipe,
    PermissionDirective,
    ListStateComponent,
  ],
})
export class RolesComponent implements OnInit {
  readonly displayedColumns = ['id', 'name', 'resources', 'action'];
  readonly list = createListPage<Role>({
    endpoint: ApiEndpoints.ROLES,
    searchColumns: ['name'],
    dialog: RoleDialogComponent,
    dialogWidth: '520px',
  });

  ngOnInit(): void {
    this.list.load();
  }

  resourceList(value: string): string[] {
    return (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
