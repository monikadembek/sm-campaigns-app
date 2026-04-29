import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignCreateForm } from './campaign-create-form';

describe('CampaignCreateForm', () => {
  let component: CampaignCreateForm;
  let fixture: ComponentFixture<CampaignCreateForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignCreateForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignCreateForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
