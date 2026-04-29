import { TestBed } from '@angular/core/testing';

import { CampaignCreateApi } from './campaign-create-api';

describe('CampaignCreateApi', () => {
  let service: CampaignCreateApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignCreateApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
