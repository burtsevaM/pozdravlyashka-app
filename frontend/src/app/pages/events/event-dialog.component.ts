import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  CelebrationEvent,
  CreateEventRequest,
  UpdateEventRequest,
} from '../../core/models/event.models';
import { Person } from '../../core/models/person.models';

export type EventDialogData = {
  people: Person[];
  event?: CelebrationEvent;
  defaultPersonId?: string;
  defaultDate?: string;
};

export type EventDialogResult = CreateEventRequest | UpdateEventRequest;

@Component({
  selector: 'app-event-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './event-dialog.component.html',
  styleUrl: './event-dialog.component.scss',
})
export class EventDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<EventDialogComponent, EventDialogResult>>(MatDialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  protected readonly data = inject<EventDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.event
    ? 'Редактировать инициативу'
    : 'Создать инициативу поздравления';

  protected readonly isEditMode = Boolean(this.data.event);

  protected readonly form = this.formBuilder.group({
    personId: [
      this.data.event?.personId ?? this.data.defaultPersonId ?? '',
      this.isEditMode ? [] : [Validators.required],
    ],
    date: [this.data.event?.date ?? this.data.defaultDate ?? '', [Validators.required]],
    budget: [
      this.data.event?.budget === null || this.data.event?.budget === undefined
        ? ''
        : String(this.data.event.budget),
      [Validators.min(0)],
    ],
  });

  protected readonly controls = this.form.controls;

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const date = this.controls.date.value;
    const budget = String(this.controls.budget.value).trim();

    if (this.isEditMode) {
      this.dialogRef.close({
        date,
        ...(budget ? { budget: Number(budget) } : {}),
      });
      return;
    }

    const personId = this.controls.personId.value;

    if (!personId) {
      this.controls.personId.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      personId,
      date,
      ...(budget ? { budget: Number(budget) } : {}),
    });
  }
}
