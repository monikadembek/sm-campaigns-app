import { TestBed } from '@angular/core/testing';

import { CampaignsApi } from './campaigns-api';

describe('CampaignsApi', () => {
  let service: CampaignsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
