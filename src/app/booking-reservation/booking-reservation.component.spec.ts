import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingReservationComponent } from './booking-reservation.component';

describe('BookingReservationComponent', () => {
  let component: BookingReservationComponent;
  let fixture: ComponentFixture<BookingReservationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingReservationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingReservationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
