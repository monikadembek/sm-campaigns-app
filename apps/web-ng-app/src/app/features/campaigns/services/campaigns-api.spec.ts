import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { Campaign } from '@sm-campaigns-app/datatypes';
import { CampaignsApi } from './campaigns-api';

// --- Mock httpResource ---

let mockValue: WritableSignal<Campaign[]>;
let mockError: WritableSignal<unknown>;
let mockStatus: WritableSignal<string>;
const mockReload = vi.fn(() => true);

vi.mock('@angular/common/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/common/http')>();
  return {
    ...original,
    httpResource: vi.fn(() => {
      mockValue = signal<Campaign[]>([]);
      mockError = signal<unknown>(undefined);
      mockStatus = signal('idle');
      return {
        value: mockValue.asReadonly(),
        error: mockError.asReadonly(),
        status: mockStatus.asReadonly(),
        hasValue: signal(false).asReadonly(),
        isLoading: signal(false).asReadonly(),
        reload: mockReload,
        asReadonly: vi.fn(function (this: unknown) { return this; }),
      };
    }),
  };
});

// --- Test data ---

const mockCampaigns: Campaign[] = [
  {
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
    goal: { id: 1, slug: 'brand-awareness', label: 'Brand Awareness', sortOrder: 1 },
    posts: [{ id: 'p1', platform: 'INSTAGRAM', postType: 'IMAGE' }],
  },
  {
    id: 'c2',
    userId: 'u1',
    goalId: 2,
    name: 'Summer Sale',
    audience: null,
    startDate: null,
    endDate: null,
    timezone: 'UTC',
    status: 'DRAFT',
    notes: 'Planning phase',
    createdAt: '2026-03-10',
    updatedAt: '2026-03-10',
    goal: { id: 2, slug: 'lead-generation', label: 'Lead Generation', sortOrder: 2 },
    posts: [],
  },
];

// --- Tests ---

describe('CampaignsApi', () => {
  let service: CampaignsApi;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call httpResource to create the campaigns resource', async () => {
    const { httpResource } = await import('@angular/common/http');
    expect(httpResource).toHaveBeenCalledTimes(1);
  });

  it('should configure httpResource with the campaigns/full URL', async () => {
    const { httpResource } = await import('@angular/common/http');
    const call = vi.mocked(httpResource).mock.calls[0];
    // First argument is a function that returns the request config
    const requestFn = call[0] as () => { url: string };
    expect(requestFn().url).toContain('/campaigns/full');
  });

  it('should configure httpResource with an empty array as default value', async () => {
    const { httpResource } = await import('@angular/common/http');
    const call = vi.mocked(httpResource).mock.calls[0];
    const options = call[1] as { defaultValue: Campaign[] };
    expect(options.defaultValue).toEqual([]);
  });

  it('should expose campaignsFullData as readonly', () => {
    expect(service.campaignsFullData).toBeDefined();
    expect(service.campaignsFullData.value).toBeDefined();
    expect(service.campaignsFullData.error).toBeDefined();
  });

  it('should default to an empty array', () => {
    expect(service.campaignsFullData.value()).toEqual([]);
  });

  it('should delegate reloadCampaigns to the underlying resource reload', () => {
    service.reloadCampaigns();
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should return the reload result from reloadCampaigns', () => {
    const result = service.reloadCampaigns();
    expect(result).toBe(true);
  });
});
