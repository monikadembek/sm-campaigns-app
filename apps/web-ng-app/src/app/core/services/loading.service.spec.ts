import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initially have isLoading as false', () => {
    expect(service.isLoading()).toBe(false);
  });

  it('should set isLoading to true when loadingOn is called', () => {
    service.loadingOn();
    expect(service.isLoading()).toBe(true);
  });

  it('should set isLoading back to false when loadingOff is called after loadingOn', () => {
    service.loadingOn();
    service.loadingOff();
    expect(service.isLoading()).toBe(false);
  });

  it('should remain loading when multiple requests are active', () => {
    service.loadingOn();
    service.loadingOn();
    service.loadingOff();
    expect(service.isLoading()).toBe(true);
  });

  it('should stop loading only when all concurrent requests finish', () => {
    service.loadingOn();
    service.loadingOn();
    service.loadingOn();

    service.loadingOff();
    expect(service.isLoading()).toBe(true);

    service.loadingOff();
    expect(service.isLoading()).toBe(true);

    service.loadingOff();
    expect(service.isLoading()).toBe(false);
  });

  it('should allow counter to go below zero if loadingOff is called without loadingOn', () => {
    service.loadingOff();
    expect(service.isLoading()).toBe(false);
  });
});
