import { TestBed } from '@angular/core/testing';

import { AiGeneratorStore } from './ai-generator-store';

describe('AiGeneratorStore', () => {
  let service: AiGeneratorStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiGeneratorStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
