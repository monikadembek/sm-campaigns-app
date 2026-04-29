import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CampaignGoal } from '@sm-campaigns-app/datatypes';
import { CampaignCreateForm } from './campaign-create-form';

const mockGoals: CampaignGoal[] = [
  { id: 1, slug: 'brand-awareness', label: 'Brand Awareness', sortOrder: 1 },
  { id: 2, slug: 'lead-generation', label: 'Lead Generation', sortOrder: 2 },
];

describe('CampaignCreateForm', () => {
  let component: CampaignCreateForm;
  let fixture: ComponentFixture<CampaignCreateForm>;

  function setup(goals: CampaignGoal[] = mockGoals) {
    TestBed.configureTestingModule({
      imports: [CampaignCreateForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignCreateForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('goals', goals);
    fixture.detectChanges();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    setup();
    expect(component.campaignForm.value.name).toBe('');
    expect(component.campaignForm.value.status).toBe('DRAFT');
    expect(component.campaignForm.value.goalId).toBeNull();
    expect(component.campaignForm.value.audience).toBeNull();
    expect(component.campaignForm.value.startDate).toBeNull();
    expect(component.campaignForm.value.endDate).toBeNull();
    expect(component.campaignForm.value.notes).toBe('');
  });

  it('should map goals input into campaignGoalSelectOptions', () => {
    setup();
    expect(component.campaignGoalSelectOptions()).toEqual([
      { label: 'Brand Awareness', value: 1 },
      { label: 'Lead Generation', value: 2 },
    ]);
  });

  it('should expose the predefined campaign status options', () => {
    setup();
    expect(component.campaignStatusSelectOptions).toEqual([
      { label: 'Draft', value: 'DRAFT' },
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Paused', value: 'PAUSED' },
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'Archived', value: 'ARCHIVED' },
    ]);
  });

  describe('validation', () => {
    it('should be invalid when name is empty', () => {
      setup();
      component.campaignForm.controls.name.setValue('');
      expect(component.name?.hasError('required')).toBe(true);
    });

    it('should be invalid when name exceeds 255 characters', () => {
      setup();
      component.campaignForm.controls.name.setValue('x'.repeat(256));
      expect(component.name?.hasError('maxlength')).toBe(true);
    });

    it('should be invalid when goalId is null', () => {
      setup();
      component.campaignForm.controls.goalId.setValue(null);
      expect(component.campaignForm.controls.goalId.hasError('required')).toBe(true);
    });

    it('should be invalid when audience exceeds 255 characters', () => {
      setup();
      component.campaignForm.controls.audience.setValue('x'.repeat(256));
      expect(component.audience?.hasError('maxlength')).toBe(true);
    });

    it('should be invalid when notes exceeds 1000 characters', () => {
      setup();
      component.campaignForm.controls.notes.setValue('x'.repeat(1001));
      expect(component.notes?.hasError('maxlength')).toBe(true);
    });

    it('should be invalid when end date is before start date', () => {
      setup();
      component.campaignForm.patchValue({
        startDate: new Date('2026-05-10'),
        endDate: new Date('2026-05-01'),
      });
      expect(component.campaignForm.hasError('endDateBeforeStartDate')).toBe(true);
    });

    it('should be valid when end date is after start date', () => {
      setup();
      component.campaignForm.patchValue({
        name: 'Test',
        goalId: 1,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-10'),
      });
      expect(component.campaignForm.hasError('endDateBeforeStartDate')).toBe(false);
    });

    it('should be valid without optional fields', () => {
      setup();
      component.campaignForm.patchValue({ name: 'My Campaign', goalId: 1 });
      expect(component.campaignForm.valid).toBe(true);
    });
  });

  describe('saveNewCampaign', () => {
    it('should emit saveForm with form values when form is valid', () => {
      setup();
      const saveSpy = vi.fn();
      component.saveForm.subscribe(saveSpy);

      component.campaignForm.patchValue({ name: 'New Campaign', goalId: 1 });
      component.saveNewCampaign();

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy.mock.calls[0][0]).toEqual(
        expect.objectContaining({ name: 'New Campaign', goalId: 1, status: 'DRAFT' }),
      );
    });

    it('should not emit saveForm when form is invalid', () => {
      setup();
      const saveSpy = vi.fn();
      component.saveForm.subscribe(saveSpy);

      component.saveNewCampaign();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit cancelEdit with false when form is pristine', () => {
      setup();
      const cancelSpy = vi.fn();
      component.cancelEdit.subscribe(cancelSpy);

      component.cancel();

      expect(cancelSpy).toHaveBeenCalledWith(false);
    });

    it('should emit cancelEdit with true when form is dirty', () => {
      setup();
      const cancelSpy = vi.fn();
      component.cancelEdit.subscribe(cancelSpy);

      component.campaignForm.controls.name.markAsDirty();
      component.cancel();

      expect(cancelSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('form getters', () => {
    it('should expose name, notes, endDate, and audience getters', () => {
      setup();
      expect(component.name).toBe(component.campaignForm.get('name'));
      expect(component.notes).toBe(component.campaignForm.get('notes'));
      expect(component.endDate).toBe(component.campaignForm.get('endDate'));
      expect(component.audience).toBe(component.campaignForm.get('audience'));
    });
  });
});
