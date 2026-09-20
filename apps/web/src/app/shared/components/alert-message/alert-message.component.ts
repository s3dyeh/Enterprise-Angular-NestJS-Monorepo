import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoPipe } from '@jsverse/transloco';

export interface AlertMessageData {
  title: string;
  body?: string;
  message?: { status: boolean; rows?: number; content?: string };
  deleteMessage?: boolean;
  submit: { status: boolean; title: string };
  close: { status: boolean; title: string };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-alert-message',
  templateUrl: './alert-message.component.html',
  styleUrl: './alert-message.component.scss',
  imports: [MatButtonModule, MatInputModule, MatDialogModule, MatFormFieldModule, TranslocoPipe],
})
export class AlertMessageComponent {
  readonly dialogRef = inject(MatDialogRef<AlertMessageComponent>);
  readonly data = inject<AlertMessageData>(MAT_DIALOG_DATA);
}
