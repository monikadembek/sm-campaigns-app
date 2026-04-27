import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignEdit } from './campaign-edit';

describe('CampaignEdit', () => {
  let component: CampaignEdit;
  let fixture: ComponentFixture<CampaignEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
