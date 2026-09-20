import { ListToolbarComponent } from '@app/shared/crud/list-toolbar.component';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiEndpoints } from '@app/core/constants';
import type { Activity } from '@app/core/models/models';
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
  selector: 'app-activities',
  templateUrl: './activities.component.html',
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
export class ActivitiesComponent implements OnInit {
  readonly displayedColumns = ['id', 'created_at', 'event', 'username', 'uri'];
  readonly list = createListPage<Activity>({
    endpoint: ApiEndpoints.ACTIVITIES,
    searchColumns: ['event', 'uri'],
    canDelete: false,
  });

  ngOnInit(): void {
    this.list.load();
  }
}
