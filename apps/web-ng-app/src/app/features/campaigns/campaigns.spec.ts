import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RouterLink, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { Campaign } from '@sm-campaigns-app/datatypes';
import { Campaigns } from './campaigns';
import { CampaignsApi } from './services/campaigns-api';

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
    notes: null,
    createdAt: '2026-03-10',
    updatedAt: '2026-03-10',
    goal: { id: 2, slug: 'lead-generation', label: 'Lead Generation', sortOrder: 2 },
    posts: [],
  },
];

function createMockCampaignsResource(overrides: {
  value?: Campaign[];
  error?: unknown;
  hasValue?: boolean;
} = {}) {
  return {
    value: signal(overrides.value ?? []),
    error: signal(overrides.error ?? undefined),
    hasValue: signal(overrides.hasValue ?? (overrides.value ? true : false)),
    isLoading: signal(false),
    status: signal(overrides.value ? 'resolved' : 'idle'),
    reload: vi.fn(),
  };
}

describe('Campaigns', () => {
  let component: Campaigns;
  let fixture: ComponentFixture<Campaigns>;
  let mockResource: ReturnType<typeof createMockCampaignsResource>;

  function setup(resourceOverrides: Parameters<typeof createMockCampaignsResource>[0] = {}) {
    mockResource = createMockCampaignsResource(resourceOverrides);

    const mockCampaignsApi = {
      campaignsFullData: mockResource,
    };

    TestBed.configureTestingModule({
      imports: [Campaigns, RouterModule.forRoot([])],
      providers: [
        { provide: CampaignsApi, useValue: mockCampaignsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Campaigns);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('should expose campaignsResource from CampaignsApi', () => {
    setup({ value: mockCampaigns, hasValue: true });
    expect(component.campaignsResource.value()).toEqual(mockCampaigns);
  });

  it('should display campaign names when data is available', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const cards = fixture.debugElement.queryAll(By.css('p-card'));
    expect(cards.length).toBe(2);
  });

  it('should display post count for each campaign', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const paragraphs = fixture.debugElement.queryAll(By.css('p'));
    const postTexts = paragraphs
      .map((p) => p.nativeElement.textContent.trim())
      .filter((text: string) => text.startsWith('Posts:'));

    expect(postTexts).toContain('Posts: 1');
    expect(postTexts).toContain('Posts: 0');
  });

  it('should display start and end dates', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Starts: 2026-04-01');
    expect(el.textContent).toContain('Ends: 2026-04-30');
  });

  it('should display n/a for missing dates', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Starts: n/a');
    expect(el.textContent).toContain('Ends: n/a');
  });

  it('should display status tags for each campaign', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const tags = fixture.debugElement.queryAll(By.css('p-tag'));
    expect(tags.length).toBe(2);
  });

  it('should generate routerLink for each campaign', () => {
    setup({ value: mockCampaigns, hasValue: true });

    const links = fixture.debugElement.queryAll(By.directive(RouterLink));
    expect(links.length).toBe(2);
  });

  it('should display error message when resource has an error', () => {
    setup({ error: 'Failed to load campaigns' });

    fixture.detectChanges();
    const errorMsg = fixture.debugElement.query(By.css('p-message'));
    expect(errorMsg).toBeTruthy();
  });

  it('should not display campaigns when hasValue is false', () => {
    setup({ hasValue: false });

    const dataView = fixture.debugElement.query(By.css('p-dataview'));
    expect(dataView).toBeFalsy();
  });

  it('should display the page heading', () => {
    setup();

    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent.trim()).toBe('Campaigns');
  });
});
