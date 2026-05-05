import { TestBed } from '@angular/core/testing';

import { PostCreateApi } from './post-create-api';

describe('PostCreateApi', () => {
  let service: PostCreateApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PostCreateApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
