import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@app/core/services/auth.service';
import { CreditAdjustmentComponent } from './credit-adjustment.component';
import { ApiEndpoints } from '@app/core/constants';
import type { AccountCredit } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslocoPipe } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { createListPage } from '@app/shared/crud/list-page';
import { ListStateComponent } from '@app/shared/crud/list-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-account-credits',
  templateUrl: './account-credits.component.html',
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
    DatePipe,
    ListStateComponent,
  ],
})
export class AccountCreditsComponent implements OnInit {
  private readonly dialogs = inject(MatDialog);
  readonly canAdjust = inject(AuthService).hasAccess('account-credit:write');
  adjust(): void {
    this.dialogs
      .open(CreditAdjustmentComponent, {
        width: '520px',
        maxWidth: 'calc(100vw - 24px)',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.list.load();
      });
  }
  readonly displayedColumns = ['id', 'account_id', 'currency', 'balance', 'updated_at'];
  readonly list = createListPage<AccountCredit>({
    endpoint: ApiEndpoints.ACCOUNT_CREDITS,
    searchColumns: ['currency'],
    canDelete: false,
  });

  ngOnInit(): void {
    this.list.load();
  }
}
