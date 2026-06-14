import { TestBed } from '@angular/core/testing';

import { ImpexApiService } from './impex-api.service';

describe('ImpexApiService', () => {
  let service: ImpexApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImpexApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
