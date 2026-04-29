import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { CampaignCreateApi } from './campaign-create-api';
import { environment } from '../../../../environments/environment';

const mockCampaignDetails: CampaignDetails = {
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

describe('CampaignCreateApi', () => {
  let service: CampaignCreateApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CampaignCreateApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createCampaign', () => {
    it('should POST to /campaigns with the payload and return campaign details', () => {
      const payload = { name: 'New Campaign', goalId: 1, status: 'DRAFT' as const };
      let response: CampaignDetails | undefined;

      service.createCampaign(payload).subscribe((res) => (response = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockCampaignDetails);

      expect(response).toEqual(mockCampaignDetails);
    });

    it('should POST with all optional fields when provided', () => {
      const payload = {
        name: 'Full Campaign',
        goalId: 2,
        status: 'ACTIVE' as const,
        audience: 'Gen Z',
        notes: 'Some notes',
        startDate: '2026-05-01',
        endDate: '2026-06-01',
      };

      service.createCampaign(payload).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns`);
      expect(req.request.body).toEqual(payload);
      req.flush(mockCampaignDetails);
    });

    it('should propagate HttpErrorResponse on 400 Bad Request', () => {
      let caughtError: HttpErrorResponse | undefined;
      service
        .createCampaign({ name: 'Bad', goalId: 1, status: 'DRAFT' })
        .subscribe({ error: (err: HttpErrorResponse) => (caughtError = err) });

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns`);
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(400);
    });

    it('should propagate HttpErrorResponse on 500 Internal Server Error', () => {
      let caughtError: HttpErrorResponse | undefined;
      service
        .createCampaign({ name: 'Test', goalId: 1, status: 'DRAFT' })
        .subscribe({ error: (err: HttpErrorResponse) => (caughtError = err) });

      const req = httpMock.expectOne(`${environment.apiUrl}/campaigns`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(500);
    });
  });
});
