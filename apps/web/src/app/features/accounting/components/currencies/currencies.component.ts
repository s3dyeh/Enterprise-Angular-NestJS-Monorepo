import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { Currency } from '@app/core/models/models';
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
import { CurrencyDialogComponent } from './currency-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-currencies',
  templateUrl: './currencies.component.html',
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
export class CurrenciesComponent implements OnInit {
  readonly displayedColumns = ['id', 'name', 'symbol', 'action'];
  readonly list = createListPage<Currency>({
    endpoint: ApiEndpoints.CURRENCIES,
    searchColumns: ['name', 'symbol'],
    dialog: CurrencyDialogComponent,
  });

  ngOnInit(): void {
    this.list.load();
  }
}
