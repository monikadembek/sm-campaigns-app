import { TestBed } from '@angular/core/testing';

import { CampaignStore } from './campaign-store';

describe('CampaignStore', () => {
  let service: CampaignStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
