import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const endDateValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (!endDate || !startDate) return null;

  return new Date(endDate).getTime() < new Date(startDate).getTime()
    ? { endDateBeforeStartDate: true }
    : null;
};
