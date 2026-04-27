import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { vi } from 'vitest';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { CampaignApi } from './campaign-api';
import { CampaignStore } from './campaign-store';
import { CampaignForm } from '../campaign.model';
import { environment } from '../../../../environments/environment';

let mockValue: WritableSignal<CampaignDetails | undefined>;
let mockError: WritableSignal<unknown>;
let mockStatus: WritableSignal<string>;
const mockReload = vi.fn();

vi.mock('@angular/common/http', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@angular/common/http')>();
  return {
    ...original,
    httpResource: vi.fn(() => {
      mockValue = signal<CampaignDetails | undefined>(undefined);
      mockError = signal<unknown>(undefined);
      mockStatus = signal('idle');
      return {
        value: mockValue.asReadonly(),
        error: mockError.asReadonly(),
        status: mockStatus.asReadonly(),
        hasValue: signal(false).asReadonly(),
        isLoading: signal(false).asReadonly(),
        reload: mockReload,
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

describe('CampaignApi', () => {
  let service: CampaignApi;
  let httpMock: HttpTestingController;
  let store: CampaignStore;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(CampaignStore);
    service = TestBed.inject(CampaignApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call httpResource to create the campaign resource', async () => {
    const { httpResource } = await import('@angular/common/http');
    expect(httpResource).toHaveBeenCalledTimes(1);
  });

  it('should configure httpResource URL with the current campaign id from the store', async () => {
    const { httpResource } = await import('@angular/common/http');
    store.setCampaignId('abc-123');

    const call = vi.mocked(httpResource).mock.calls[0];
    const requestFn = call[0] as () => { url: string };
    expect(requestFn().url).toBe(
      `${environment.apiUrl}/campaigns/abc-123`,
    );
  });

  it('should configure httpResource with undefined as default value', async () => {
    const { httpResource } = await import('@angular/common/http');
    const call = vi.mocked(httpResource).mock.calls[0];
    const options = call[1] as { defaultValue: undefined };
    expect(options.defaultValue).toBeUndefined();
  });

  it('should expose campaignResource as readonly', () => {
    expect(service.campaignResource).toBeDefined();
    expect(service.campaignResource.value).toBeDefined();
    expect(service.campaignResource.error).toBeDefined();
  });

  it('should default value to undefined', () => {
    expect(service.campaignResource.value()).toBeUndefined();
  });

  it('should delegate reloadCampaign to the underlying resource reload', () => {
    service.reloadCampaign();
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  describe('deleteCampaign', () => {
    it('should DELETE the campaign by id and return the response', () => {
      let response: string | undefined;
      service.deleteCampaign('c1').subscribe((res) => (response = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns/c1`);
      expect(req.request.method).toBe('DELETE');
      req.flush('deleted');

      expect(response).toBe('deleted');
    });

    it('should propagate HttpErrorResponse on failure', () => {
      let caughtError: HttpErrorResponse | undefined;
      service.deleteCampaign('c1').subscribe({
        error: (err: HttpErrorResponse) => (caughtError = err),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns/c1`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(404);
    });
  });

  describe('saveEditedCampaign', () => {
    const formValues: CampaignForm = {
      name: 'Updated Name',
      goalId: 1,
      audience: 'Gen Z',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'ACTIVE',
      notes: '',
    };

    it('should PATCH the campaign with form values and return the updated campaign', () => {
      let response: CampaignDetails | undefined;
      service
        .saveEditedCampaign('c1', formValues)
        .subscribe((res) => (response = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns/c1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(formValues);
      req.flush(mockCampaignDetails);

      expect(response).toEqual(mockCampaignDetails);
    });

    it('should propagate HttpErrorResponse on failure', () => {
      let caughtError: HttpErrorResponse | undefined;
      service.saveEditedCampaign('c1', formValues).subscribe({
        error: (err: HttpErrorResponse) => (caughtError = err),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns/c1`);
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(400);
    });
  });
});
