import { TestBed } from '@angular/core/testing';

import { Reservation2Service } from './Services/Reservation2/reservation2.service';

describe('Reservation2Service', () => {
  let service: Reservation2Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Reservation2Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
