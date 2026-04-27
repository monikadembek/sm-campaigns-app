import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CampaignDetails as CampaignDetailsType } from '@sm-campaigns-app/datatypes';
import { CampaignDetailsComponent } from './campaign-details';

const mockCampaignDetails: CampaignDetailsType = {
  id: 'c1',
  userId: 'u1',
  goalId: 1,
  name: 'Spring Launch',
  audience: 'Gen Z',
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  timezone: 'UTC',
  status: 'ACTIVE',
  notes: 'Important campaign',
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

describe('CampaignDetailsComponent', () => {
  let component: CampaignDetailsComponent;
  let fixture: ComponentFixture<CampaignDetailsComponent>;

  function setup(campaignData: CampaignDetailsType | undefined) {
    TestBed.configureTestingModule({
      imports: [CampaignDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('campaignData', campaignData);
    fixture.detectChanges();
  }

  it('should create', () => {
    setup(mockCampaignDetails);
    expect(component).toBeTruthy();
  });

  it('should render the campaign name as the title', () => {
    setup(mockCampaignDetails);
    const title = fixture.debugElement.query(By.css('.campaign-details__title'));
    expect(title.nativeElement.textContent.trim()).toBe('Spring Launch');
  });

  it('should render the campaign status (uppercased) in the tag', () => {
    setup(mockCampaignDetails);
    const tag = fixture.debugElement.query(By.css('p-tag'));
    expect(tag).toBeTruthy();
    expect(tag.componentInstance.value).toBe('ACTIVE');
  });

  it('should render the goal label', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Brand Awareness');
  });

  it('should render the start date', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2026-04-01');
  });

  it('should render the end date', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2026-04-30');
  });

  it('should render the audience', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Gen Z');
  });

  it('should render the notes', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Important campaign');
  });

  it('should render "Not set" for missing start date', () => {
    setup({ ...mockCampaignDetails, startDate: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Not set');
  });

  it('should render "Not set" for missing end date', () => {
    setup({ ...mockCampaignDetails, endDate: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Not set');
  });

  it('should render "Not defined" for missing audience', () => {
    setup({ ...mockCampaignDetails, audience: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Not defined');
  });

  it('should render "No notes added" for missing notes', () => {
    setup({ ...mockCampaignDetails, notes: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No notes added');
  });

  it('should not crash when campaignData is undefined', () => {
    setup(undefined);
    expect(component).toBeTruthy();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should expose the section labels', () => {
    setup(mockCampaignDetails);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Goal');
    expect(el.textContent).toContain('Start date');
    expect(el.textContent).toContain('End date');
    expect(el.textContent).toContain('Audience');
    expect(el.textContent).toContain('Notes');
  });
});
