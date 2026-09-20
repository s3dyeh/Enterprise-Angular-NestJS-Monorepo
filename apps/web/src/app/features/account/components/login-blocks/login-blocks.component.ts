import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import { createListPage } from '@app/shared/crud/list-page';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiEndpoints } from '@app/core/constants';
import type { LoginBlock } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslocoPipe } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { ListStateComponent } from '@app/shared/crud/list-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login-blocks',
  templateUrl: './login-blocks.component.html',
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
export class LoginBlocksComponent implements OnInit {
  private readonly http = inject(HttpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['key', 'attempts', 'stage', 'locked', 'locked_until', 'action'];
  readonly list = createListPage<LoginBlock>({
    endpoint: ApiEndpoints.LOGIN_BLOCKS,
    searchColumns: ['key'],
    canDelete: false,
  });

  ngOnInit(): void {
    this.list.load();
  }

  unblock(row: LoginBlock): void {
    this.http
      .post(`${ApiEndpoints.LOGIN_BLOCKS}/unblock`, { ip: row.key })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.list.load());
  }
}
