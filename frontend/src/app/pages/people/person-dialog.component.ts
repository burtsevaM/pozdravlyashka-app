import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreatePersonRequest, Person, UpdatePersonRequest } from '../../core/models/person.models';

type PersonDialogData = {
  person?: Person;
};

type PersonDialogResult = CreatePersonRequest | UpdatePersonRequest;

@Component({
  selector: 'app-person-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './person-dialog.component.html',
  styleUrl: './person-dialog.component.scss',
})
export class PersonDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<PersonDialogComponent, PersonDialogResult>>(MatDialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly data =
    inject<PersonDialogData | null>(MAT_DIALOG_DATA, {
      optional: true,
    }) ?? {};

  protected readonly title = this.data.person ? 'Редактировать участника' : 'Добавить участника';

  protected readonly form = this.formBuilder.group({
    fullName: [this.data.person?.fullName ?? '', [Validators.required, Validators.maxLength(160)]],
    birthDate: [this.data.person?.birthDate ?? '', [Validators.required]],
    email: [this.data.person?.email ?? '', [Validators.email]],
    department: [this.data.person?.department ?? '', [Validators.maxLength(120)]],
    preferences: [this.data.person?.preferences ?? '', [Validators.maxLength(1000)]],
    notes: [this.data.person?.notes ?? '', [Validators.maxLength(1000)]],
  });

  protected readonly controls = this.form.controls;

  protected save(): void {
    const fullName = this.controls.fullName.value.trim();

    if (!fullName) {
      this.controls.fullName.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      fullName,
      birthDate: this.controls.birthDate.value,
      ...this.optionalField('email', this.controls.email.value),
      ...this.optionalField('department', this.controls.department.value),
      ...this.optionalField('preferences', this.controls.preferences.value),
      ...this.optionalField('notes', this.controls.notes.value),
    });
  }

  private optionalField<Key extends keyof CreatePersonRequest>(
    key: Key,
    value: string,
  ): Partial<CreatePersonRequest> {
    const trimmedValue = value.trim();
    return trimmedValue ? { [key]: trimmedValue } : {};
  }
}
