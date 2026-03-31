import { TestBed } from '@angular/core/testing';

import { AiGeneratorApi } from './ai-generator-api';

describe('AiGeneratorApi', () => {
  let service: AiGeneratorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiGeneratorApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
