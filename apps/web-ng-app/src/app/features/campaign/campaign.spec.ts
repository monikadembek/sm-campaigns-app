import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { Campaign } from './campaign';
import { CampaignApi } from './services/campaign-api';
import { CampaignStore } from './services/campaign-store';
import { CampaignForm } from './campaign.model';

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
  notes: null,
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

function createMockCampaignResource(overrides: {
  value?: CampaignDetails | undefined;
  error?: unknown;
  hasValue?: boolean;
} = {}) {
  const valueSig: WritableSignal<CampaignDetails | undefined> = signal(
    overrides.value,
  );
  const errorSig: WritableSignal<unknown> = signal(overrides.error);
  const hasValueSig: WritableSignal<boolean> = signal(
    overrides.hasValue ?? !!overrides.value,
  );
  return {
    value: valueSig,
    error: errorSig,
    hasValue: hasValueSig,
    isLoading: signal(false),
    status: signal(overrides.value ? 'resolved' : 'idle'),
    reload: vi.fn(),
  };
}

describe('Campaign', () => {
  let component: Campaign;
  let fixture: ComponentFixture<Campaign>;
  let mockResource: ReturnType<typeof createMockCampaignResource>;
  let routeParams$: Subject<{ id: string }>;
  let mockCampaignApi: {
    campaignResource: ReturnType<typeof createMockCampaignResource>;
    reloadCampaign: ReturnType<typeof vi.fn>;
    deleteCampaign: ReturnType<typeof vi.fn>;
    saveEditedCampaign: ReturnType<typeof vi.fn>;
  };
  let mockStore: {
    campaignId: ReturnType<typeof signal<string>>;
    setCampaignId: ReturnType<typeof vi.fn>;
  };
  let messageServiceAddSpy: ReturnType<typeof vi.fn>;
  let confirmationServiceConfirmSpy: ReturnType<typeof vi.fn>;
  let routerNavigateSpy: ReturnType<typeof vi.fn>;

  function setup(
    resourceOverrides: Parameters<typeof createMockCampaignResource>[0] = {},
  ) {
    mockResource = createMockCampaignResource(resourceOverrides);
    routeParams$ = new Subject<{ id: string }>();

    const campaignIdSignal = signal<string>('');
    mockStore = {
      campaignId: campaignIdSignal,
      setCampaignId: vi.fn((id: string) => campaignIdSignal.set(id)),
    };

    mockCampaignApi = {
      campaignResource: mockResource,
      reloadCampaign: vi.fn(),
      deleteCampaign: vi.fn().mockReturnValue(of('deleted')),
      saveEditedCampaign: vi.fn().mockReturnValue(of(mockCampaignDetails)),
    };

    messageServiceAddSpy = vi.fn();
    routerNavigateSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [Campaign, RouterModule.forRoot([])],
      providers: [
        ConfirmationService,
        { provide: CampaignApi, useValue: mockCampaignApi },
        { provide: CampaignStore, useValue: mockStore },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
        {
          provide: MessageService,
          useValue: { add: messageServiceAddSpy },
        },
        {
          provide: Router,
          useValue: { navigate: routerNavigateSpy, createUrlTree: () => ({}), serializeUrl: () => '' },
        },
      ],
    }).compileComponents();

    const confirmationService = TestBed.inject(ConfirmationService);
    confirmationServiceConfirmSpy = vi.spyOn(
      confirmationService,
      'confirm',
    ) as unknown as ReturnType<typeof vi.fn>;

    fixture = TestBed.createComponent(Campaign);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setup({ value: mockCampaignDetails });
    expect(component).toBeTruthy();
  });

  it('should set campaign id from route params', () => {
    setup({ value: mockCampaignDetails });
    routeParams$.next({ id: 'c1' });
    expect(mockStore.setCampaignId).toHaveBeenCalledWith('c1');
  });

  it('should default mode to read', () => {
    setup({ value: mockCampaignDetails });
    expect(component.mode()).toBe('read');
  });

  it('should switch mode to edit when editCampaign is called', () => {
    setup({ value: mockCampaignDetails });
    component.editCampaign();
    expect(component.mode()).toBe('edit');
  });

  it('should switch mode via setMode', () => {
    setup({ value: mockCampaignDetails });
    component.setMode('edit');
    expect(component.mode()).toBe('edit');
    component.setMode('read');
    expect(component.mode()).toBe('read');
  });

  it('should navigate to /campaigns and show error toast when resource returns 404', () => {
    setup({
      error: new HttpErrorResponse({ status: 404, statusText: 'Not Found' }),
    });
    fixture.detectChanges();

    expect(messageServiceAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
        detail: 'Campaign with given id was not found',
      }),
    );
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/campaigns']);
  });

  it('should navigate to /campaigns and show error toast when resource returns 400', () => {
    setup({
      error: new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }),
    });
    fixture.detectChanges();

    expect(messageServiceAddSpy).toHaveBeenCalled();
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/campaigns']);
  });

  it('should not navigate away on non-404/400 errors', () => {
    setup({
      error: new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
    });
    fixture.detectChanges();

    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it('should open confirmation dialog when confirmDelete is called', () => {
    setup({ value: mockCampaignDetails });
    const event = { target: document.createElement('button') } as unknown as Event;

    component.confirmDelete(event);

    expect(confirmationServiceConfirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Do you want to delete this campaign?',
        header: 'Confirm',
      }),
    );
  });

  it('should call deleteCampaign on confirmation accept', () => {
    setup({ value: mockCampaignDetails });
    mockStore.campaignId.set('c1');
    const event = { target: document.createElement('button') } as unknown as Event;
    const deleteSpy = vi.spyOn(component, 'deleteCampaign');

    component.confirmDelete(event);
    const confirmConfig = confirmationServiceConfirmSpy.mock.calls[0][0];
    confirmConfig.accept();

    expect(deleteSpy).toHaveBeenCalledWith('c1', 'Spring Launch');
  });

  it('should show success toast and navigate when deleteCampaign succeeds', () => {
    setup({ value: mockCampaignDetails });

    component.deleteCampaign('c1', 'Spring Launch');

    expect(mockCampaignApi.deleteCampaign).toHaveBeenCalledWith('c1');
    expect(messageServiceAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        summary: 'Confirmed',
        detail: 'Campaign with id c1 was deleted',
      }),
    );
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/campaigns']);
  });

  it('should show error toast when deleteCampaign fails', () => {
    setup({ value: mockCampaignDetails });
    const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    mockCampaignApi.deleteCampaign.mockReturnValue(throwError(() => error));

    component.deleteCampaign('c1', 'Spring Launch');

    expect(messageServiceAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
        detail: expect.stringContaining('Deleting campaign Spring Launch failed.'),
      }),
    );
  });

  it('should switch back to read mode and call saveEditedCampaign on saveCampaignForm', () => {
    setup({ value: mockCampaignDetails });
    mockStore.campaignId.set('c1');
    component.setMode('edit');

    const formValues: CampaignForm = {
      name: 'Updated Name',
      goalId: 1,
      audience: 'Gen Z',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'ACTIVE',
      notes: '',
    };

    component.saveCampaignForm(formValues);

    expect(component.mode()).toBe('read');
    expect(mockCampaignApi.saveEditedCampaign).toHaveBeenCalledWith('c1', formValues);
  });

  it('should show success toast and reload campaign after successful save', () => {
    setup({ value: mockCampaignDetails });
    mockStore.campaignId.set('c1');

    const formValues: CampaignForm = {
      name: 'Updated Name',
      goalId: 1,
      audience: 'Gen Z',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'ACTIVE',
      notes: '',
    };

    component.saveCampaignForm(formValues);

    expect(messageServiceAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        summary: 'Saved',
        detail: 'Campaign with id c1 was updated',
      }),
    );
    expect(mockCampaignApi.reloadCampaign).toHaveBeenCalled();
  });

  it('should show error toast when saveCampaignForm fails', () => {
    setup({ value: mockCampaignDetails });
    mockStore.campaignId.set('c1');
    const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
    mockCampaignApi.saveEditedCampaign.mockReturnValue(throwError(() => error));

    const formValues: CampaignForm = {
      name: 'Updated Name',
      goalId: 1,
      audience: 'Gen Z',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'ACTIVE',
      notes: '',
    };

    component.saveCampaignForm(formValues);

    expect(messageServiceAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
        detail: expect.stringContaining('Updating campaign Spring Launch failed.'),
      }),
    );
  });

  it('should render campaign name in nav when data is available', () => {
    setup({ value: mockCampaignDetails, hasValue: true });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Spring Launch');
  });

  it('should render error message when resource has an error', () => {
    setup({ error: 'Something went wrong' });
    fixture.detectChanges();

    const errorMsg = fixture.debugElement.query(By.css('p-message'));
    expect(errorMsg).toBeTruthy();
  });

  it('should render delete and edit buttons in read mode', () => {
    setup({ value: mockCampaignDetails, hasValue: true });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Delete campaign');
    expect(el.textContent).toContain('Edit campaign');
  });

  it('should not render edit/delete buttons when in edit mode', () => {
    setup({ value: mockCampaignDetails, hasValue: true });
    component.setMode('edit');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Delete campaign');
    expect(el.textContent).not.toContain('Edit campaign');
  });

  it('should display empty posts message when there are no posts', () => {
    setup({ value: mockCampaignDetails, hasValue: true });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No posts are currently added to the campaign');
  });
});
