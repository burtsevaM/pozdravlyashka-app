import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  CreateGiftHistoryRequest,
  GiftHistory,
  UpdateGiftHistoryRequest,
} from '../../core/models/gift-history.models';

type GiftHistoryDialogData = {
  giftHistory?: GiftHistory;
};

type GiftHistoryDialogResult = CreateGiftHistoryRequest | UpdateGiftHistoryRequest;

@Component({
  selector: 'app-gift-history-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './gift-history-dialog.component.html',
  styleUrl: './gift-history-dialog.component.scss',
})
export class GiftHistoryDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<GiftHistoryDialogComponent, GiftHistoryDialogResult>>(MatDialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly data =
    inject<GiftHistoryDialogData | null>(MAT_DIALOG_DATA, {
      optional: true,
    }) ?? {};

  protected readonly title = this.data.giftHistory
    ? 'Редактировать подарок'
    : 'Добавить подарок в историю';

  protected readonly form = this.formBuilder.group({
    giftName: [
      this.data.giftHistory?.giftName ?? '',
      [Validators.required, Validators.maxLength(160)],
    ],
    year: [
      this.data.giftHistory?.year === null || this.data.giftHistory?.year === undefined
        ? ''
        : String(this.data.giftHistory.year),
      [Validators.min(1900), Validators.max(2100)],
    ],
    occasion: [this.data.giftHistory?.occasion ?? '', [Validators.maxLength(120)]],
    amount: [
      this.data.giftHistory?.amount === null || this.data.giftHistory?.amount === undefined
        ? ''
        : String(this.data.giftHistory.amount),
      [Validators.min(0)],
    ],
    organizerName: [this.data.giftHistory?.organizerName ?? '', [Validators.maxLength(160)]],
    comment: [this.data.giftHistory?.comment ?? '', [Validators.maxLength(1000)]],
  });

  protected readonly controls = this.form.controls;

  protected save(): void {
    const giftName = this.controls.giftName.value.trim();

    if (!giftName) {
      this.controls.giftName.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      giftName,
      ...this.optionalNumberField('year', this.controls.year.value),
      ...this.optionalField('occasion', this.controls.occasion.value),
      ...this.optionalNumberField('amount', this.controls.amount.value),
      ...this.optionalField('organizerName', this.controls.organizerName.value),
      ...this.optionalField('comment', this.controls.comment.value),
    });
  }

  private optionalField<Key extends keyof CreateGiftHistoryRequest>(
    key: Key,
    value: string,
  ): Partial<CreateGiftHistoryRequest> {
    const trimmedValue = value.trim();
    return trimmedValue ? { [key]: trimmedValue } : {};
  }

  private optionalNumberField<Key extends 'year' | 'amount'>(
    key: Key,
    value: string | number,
  ): Partial<CreateGiftHistoryRequest> {
    const trimmedValue = String(value).trim();
    return trimmedValue ? { [key]: Number(trimmedValue) } : {};
  }
}
