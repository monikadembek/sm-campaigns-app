import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { CampaignGoal, CampaignDetails } from '@sm-campaigns-app/datatypes';
import { CampaignCreate } from './campaign-create';
import { CampaignCreateApi } from './services/campaign-create-api';
import { CampaignGoalsApi } from '../../shared/services/campaign-goals-api';

const mockGoals: CampaignGoal[] = [
  { id: 1, slug: 'brand-awareness', label: 'Brand Awareness', sortOrder: 1 },
];

const mockCreatedCampaign: CampaignDetails = {
  id: 'new-id',
  userId: 'u1',
  goalId: 1,
  name: 'New Campaign',
  audience: null,
  startDate: null,
  endDate: null,
  timezone: 'UTC',
  status: 'DRAFT',
  notes: null,
  createdAt: '2026-04-29',
  updatedAt: '2026-04-29',
  goal: { id: 1, slug: 'brand-awareness', label: 'Brand Awareness', sortOrder: 1 },
  posts: [],
};

describe('CampaignCreate', () => {
  let component: CampaignCreate;
  let fixture: ComponentFixture<CampaignCreate>;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockMessageService: { add: ReturnType<typeof vi.fn> };
  let mockCreateApi: { createCampaign: ReturnType<typeof vi.fn> };
  let mockGoalsResource: { value: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let confirmationService: ConfirmationService;

  function setup() {
    mockRouter = { navigate: vi.fn() };
    mockMessageService = { add: vi.fn() };
    mockCreateApi = { createCampaign: vi.fn() };
    mockGoalsResource = {
      value: vi.fn().mockReturnValue(mockGoals),
      error: vi.fn().mockReturnValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [CampaignCreate],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        ConfirmationService,
        { provide: CampaignCreateApi, useValue: mockCreateApi },
        {
          provide: CampaignGoalsApi,
          useValue: { goals: mockGoalsResource },
        },
      ],
    }).compileComponents();

    confirmationService = TestBed.inject(ConfirmationService);

    fixture = TestBed.createComponent(CampaignCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    setup();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  describe('canDeactivate', () => {
    it('should return true immediately when form is pristine', () => {
      setup();
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return true immediately after successful form submission', () => {
      setup();
      mockCreateApi.createCampaign.mockReturnValue(of(mockCreatedCampaign));
      component.saveNewCampaign({ name: 'Test', goalId: 1, status: 'DRAFT' });

      expect(component.canDeactivate()).toBe(true);
    });

    it('should open confirmation dialog when form is dirty and not submitted', () => {
      setup();
      const confirmSpy = vi.spyOn(confirmationService, 'confirm');
      component.createFormComponent().campaignForm.markAsDirty();

      component.canDeactivate();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    it('should return an Observable that resolves to true when user accepts', async () => {
      setup();
      component.createFormComponent().campaignForm.markAsDirty();

      let capturedAccept: (() => void) | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation(({ accept }: { accept?: () => void }) => {
        capturedAccept = accept;
        return confirmationService;
      });

      const result = component.canDeactivate() as ReturnType<Subject<boolean>['asObservable']>;
      const promise = firstValueFrom(result);
      capturedAccept?.();

      expect(await promise).toBe(true);
    });

    it('should return an Observable that resolves to false when user rejects', async () => {
      setup();
      component.createFormComponent().campaignForm.markAsDirty();

      let capturedReject: (() => void) | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation(({ reject }: { reject?: () => void }) => {
        capturedReject = reject;
        return confirmationService;
      });

      const result = component.canDeactivate() as ReturnType<Subject<boolean>['asObservable']>;
      const promise = firstValueFrom(result);
      capturedReject?.();

      expect(await promise).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should navigate to /campaigns', () => {
      setup();
      component.cancel();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaigns']);
    });
  });

  describe('saveNewCampaign', () => {
    it('should call createCampaign API with the form payload', () => {
      setup();
      mockCreateApi.createCampaign.mockReturnValue(of(mockCreatedCampaign));

      component.saveNewCampaign({ name: 'New Campaign', goalId: 1, status: 'DRAFT' });

      expect(mockCreateApi.createCampaign).toHaveBeenCalledWith({
        name: 'New Campaign',
        goalId: 1,
        status: 'DRAFT',
      });
    });

    it('should show success toast and navigate to /campaigns on success', () => {
      setup();
      mockCreateApi.createCampaign.mockReturnValue(of(mockCreatedCampaign));

      component.saveNewCampaign({ name: 'New Campaign', goalId: 1, status: 'DRAFT' });

      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaigns']);
    });

    it('should show error toast on API failure', () => {
      setup();
      const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
      mockCreateApi.createCampaign.mockReturnValue(throwError(() => error));

      component.saveNewCampaign({ name: 'New Campaign', goalId: 1, status: 'DRAFT' });

      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
