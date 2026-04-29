import { TestBed } from '@angular/core/testing';

import { CampaignGoalsApi } from './campaign-goals-api';

describe('CampaignGoalsApi', () => {
  let service: CampaignGoalsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignGoalsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
