import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignDetails } from './campaign-details';

describe('CampaignDetails', () => {
  let component: CampaignDetails;
  let fixture: ComponentFixture<CampaignDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
