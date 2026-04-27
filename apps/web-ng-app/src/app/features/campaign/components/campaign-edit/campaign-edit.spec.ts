import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import {
  CampaignDetails,
  CampaignGoal,
} from '@sm-campaigns-app/datatypes';
import { CampaignEdit } from './campaign-edit';

const mockGoals: CampaignGoal[] = [
  { id: 1, slug: 'brand-awareness', label: 'Brand Awareness', sortOrder: 1 },
  { id: 2, slug: 'lead-generation', label: 'Lead Generation', sortOrder: 2 },
];

let goalsValue: WritableSignal<CampaignGoal[]>;

vi.mock('@angular/common/http', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@angular/common/http')>();
  return {
    ...original,
    httpResource: vi.fn(() => {
      goalsValue = signal<CampaignGoal[]>(mockGoals);
      return {
        value: goalsValue.asReadonly(),
        error: signal(undefined).asReadonly(),
        status: signal('resolved').asReadonly(),
        hasValue: signal(true).asReadonly(),
        isLoading: signal(false).asReadonly(),
        reload: vi.fn(),
        asReadonly: vi.fn(function (this: unknown) {
          return this;
        }),
      };
    }),
  };
});

const mockCampaignDetails: CampaignDetails = {
  id: 'c1',
  userId: 'u1',
  goalId: 1,
  name: 'Spring Launch',
  audience: 'Gen Z',
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  timezone: 'UTC',
  status: 'ACTIVE',
  notes: 'Some notes',
  createdAt: '2026-03-01',
  updatedAt: '2026-03-15',
  goal: {
    id: 1,
    slug: 'brand-awareness',
    label: 'Brand Awareness',
    sortOrder: 1,
  },
  posts: [],
};

describe('CampaignEdit', () => {
  let component: CampaignEdit;
  let fixture: ComponentFixture<CampaignEdit>;

  function setup(campaignData: CampaignDetails | undefined = mockCampaignDetails) {
    TestBed.configureTestingModule({
      imports: [CampaignEdit],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignEdit);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('campaignData', campaignData);
    fixture.detectChanges();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('should populate the form from campaignData', () => {
    setup();
    expect(component.campaignForm.value.name).toBe('Spring Launch');
    expect(component.campaignForm.value.goalId).toBe(1);
    expect(component.campaignForm.value.audience).toBe('Gen Z');
    expect(component.campaignForm.value.status).toBe('ACTIVE');
    expect(component.campaignForm.value.notes).toBe('Some notes');
    expect(component.campaignForm.value.startDate).toBeInstanceOf(Date);
    expect(component.campaignForm.value.endDate).toBeInstanceOf(Date);
  });

  it('should leave the form untouched when setFormValues is called with undefined data', () => {
    setup();
    fixture.componentRef.setInput('campaignData', undefined);
    component.campaignForm.reset();

    component.setFormValues();

    expect(component.campaignForm.value.name).toBe('');
    expect(component.campaignForm.value.status).toBe('DRAFT');
  });

  it('should fall back to empty strings when nullable fields are null', () => {
    setup({
      ...mockCampaignDetails,
      audience: null,
      notes: null,
      startDate: null,
      endDate: null,
    });
    expect(component.campaignForm.value.audience).toBe('');
    expect(component.campaignForm.value.notes).toBe('');
    expect(component.campaignForm.value.startDate).toBeNull();
    expect(component.campaignForm.value.endDate).toBeNull();
  });

  it('should map loaded goals into select options', () => {
    setup();
    expect(component.campaignGoalSelectOptions).toEqual([
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

  it('should mark name as invalid when empty', () => {
    setup();
    component.campaignForm.controls.name.setValue('');
    expect(component.name?.hasError('required')).toBe(true);
  });

  it('should mark name as invalid when longer than 255 characters', () => {
    setup();
    component.campaignForm.controls.name.setValue('x'.repeat(256));
    expect(component.name?.hasError('maxlength')).toBe(true);
  });

  it('should mark form invalid when end date is before start date', () => {
    setup();
    component.campaignForm.patchValue({
      startDate: new Date('2026-05-10'),
      endDate: new Date('2026-05-01'),
    });
    expect(component.campaignForm.hasError('endDateBeforeStartDate')).toBe(true);
  });

  it('should mark form valid when end date is after start date', () => {
    setup();
    component.campaignForm.patchValue({
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-10'),
    });
    expect(component.campaignForm.hasError('endDateBeforeStartDate')).toBe(
      false,
    );
  });

  it('should emit cancelEdit when cancel is called', () => {
    setup();
    const cancelSpy = vi.fn();
    component.cancelEdit.subscribe(cancelSpy);

    component.cancel();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit saveEditedForm with form values when form is valid', () => {
    setup();
    const saveSpy = vi.fn();
    component.saveEditedForm.subscribe(saveSpy);

    component.saveCampaignChanges();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Spring Launch',
        goalId: 1,
        status: 'ACTIVE',
      }),
    );
  });

  it('should not emit saveEditedForm when form is invalid', () => {
    setup();
    const saveSpy = vi.fn();
    component.saveEditedForm.subscribe(saveSpy);
    component.campaignForm.controls.name.setValue('');

    component.saveCampaignChanges();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should expose name, notes, and endDate getters from the form', () => {
    setup();
    expect(component.name).toBe(component.campaignForm.get('name'));
    expect(component.notes).toBe(component.campaignForm.get('notes'));
    expect(component.endDate).toBe(component.campaignForm.get('endDate'));
  });
});
