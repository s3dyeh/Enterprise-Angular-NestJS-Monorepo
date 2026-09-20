import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { City, Region } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpService } from '@app/core/services/http.service';
import { createListPage } from '@app/shared/crud/list-page';
import { ListStateComponent } from '@app/shared/crud/list-state.component';
import { CityDialogComponent } from './city-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cities',
  templateUrl: './cities.component.html',
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
export class CitiesComponent implements OnInit {
  private readonly http = inject(HttpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['id', 'name', 'region', 'action'];
  regions = signal<Region[]>([]);
  readonly list = createListPage<City>({
    endpoint: ApiEndpoints.CITIES,
    searchColumns: ['name'],
    dialog: CityDialogComponent,
    dialogWidth: '420px',
    dialogData: (row) => ({ row, regions: this.regions() }),
  });

  ngOnInit(): void {
    this.http
      .get<Region[]>(`all/${ApiEndpoints.REGIONS}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.regions.set(Array.isArray(res) ? res : []);
      });
    this.list.load();
  }

  regionName(id: number): string {
    return this.regions().find((item) => item.id === id)?.name || String(id);
  }
}
