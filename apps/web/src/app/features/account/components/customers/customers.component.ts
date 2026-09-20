import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import { PermissionDirective } from '@app/core/directives/permission.directive';
import type { Account } from '@app/core/models/models';
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
import { AccountFormDialogComponent } from '../account-form/account-form-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-customers',
  templateUrl: './customers.component.html',
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
export class CustomersComponent implements OnInit {
  readonly displayedColumns = ['id', 'full_name', 'username', 'email', 'phone', 'status', 'action'];
  readonly list = createListPage<Account>({
    endpoint: ApiEndpoints.CUSTOMERS,
    searchColumns: ['full_name', 'username', 'phone'],
    dialog: AccountFormDialogComponent,
    dialogWidth: '480px',
    dialogData: (row) => ({ row, kind: 'customer' }),
  });

  ngOnInit(): void {
    this.list.load();
  }
}
