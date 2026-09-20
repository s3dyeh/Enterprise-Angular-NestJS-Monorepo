import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { Region } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslocoPipe } from '@jsverse/transloco';
import { createListPage } from '@app/shared/crud/list-page';
import { ListStateComponent } from '@app/shared/crud/list-state.component';
import { RegionDialogComponent } from './region-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-regions',
  templateUrl: './regions.component.html',
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
    TranslocoPipe,
    PermissionDirective,
    ListStateComponent,
  ],
})
export class RegionsComponent implements OnInit {
  readonly displayedColumns = ['id', 'name', 'action'];
  readonly list = createListPage<Region>({
    endpoint: ApiEndpoints.REGIONS,
    searchColumns: ['name'],
    dialog: RegionDialogComponent,
    dialogWidth: '420px',
  });

  ngOnInit(): void {
    this.list.load();
  }
}
