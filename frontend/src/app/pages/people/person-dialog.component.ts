import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  CreatePersonRequest,
  Person,
  UpdatePersonRequest,
} from '../../core/models/person.models';

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
  private readonly dialogRef = inject<
    MatDialogRef<PersonDialogComponent, PersonDialogResult>
  >(MatDialogRef);
  private readonly data = inject<PersonDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.person ? 'Редактировать участника' : 'Добавить участника';

  protected readonly fullNameControl = new FormControl(this.data.person?.fullName ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });

  protected readonly birthDateControl = new FormControl(this.data.person?.birthDate ?? '', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected readonly emailControl = new FormControl(this.data.person?.email ?? '', {
    nonNullable: true,
    validators: [Validators.email],
  });

  protected readonly departmentControl = new FormControl(this.data.person?.department ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(120)],
  });

  protected readonly preferencesControl = new FormControl(this.data.person?.preferences ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(1000)],
  });

  protected readonly notesControl = new FormControl(this.data.person?.notes ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(1000)],
  });

  protected save(): void {
    const controls = [
      this.fullNameControl,
      this.birthDateControl,
      this.emailControl,
      this.departmentControl,
      this.preferencesControl,
      this.notesControl,
    ];

    if (controls.some((control) => control.invalid)) {
      controls.forEach((control) => control.markAsTouched());
      return;
    }

    this.dialogRef.close({
      fullName: this.fullNameControl.value.trim(),
      birthDate: this.birthDateControl.value,
      ...this.optionalField('email', this.emailControl.value),
      ...this.optionalField('department', this.departmentControl.value),
      ...this.optionalField('preferences', this.preferencesControl.value),
      ...this.optionalField('notes', this.notesControl.value),
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
