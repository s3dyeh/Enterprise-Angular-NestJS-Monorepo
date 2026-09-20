import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { AppSetting } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslocoPipe } from '@jsverse/transloco';
import { createListPage } from '@app/shared/crud/list-page';
import { ListStateComponent } from '@app/shared/crud/list-state.component';
import { SettingDialogComponent } from './setting-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    ListToolbarComponent,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    TranslocoPipe,
    PermissionDirective,
    ListStateComponent,
  ],
})
export class SystemSettingsComponent implements OnInit {
  readonly displayedColumns = ['id', 'property', 'value', 'description', 'action'];
  readonly list = createListPage<AppSetting>({
    endpoint: ApiEndpoints.SETTINGS,
    searchColumns: ['property', 'value', 'description'],
    dialog: SettingDialogComponent,
    canDelete: false,
  });

  ngOnInit(): void {
    this.list.load();
  }
}
