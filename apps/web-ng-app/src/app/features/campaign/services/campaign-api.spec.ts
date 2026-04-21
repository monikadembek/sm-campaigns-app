import { TestBed } from '@angular/core/testing';

import { CampaignApi } from './campaign-api';

describe('CampaignApi', () => {
  let service: CampaignApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
