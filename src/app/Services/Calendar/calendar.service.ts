import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  constructor() { }

  // BehaviorSubject to hold selected arrival and departure dates
  private selectedDatesSubject = new BehaviorSubject<{ arrivalDate: Date | null, departureDate: Date | null }>({
    arrivalDate: null,
    departureDate: null
  });

  // Observable for other components to subscribe to
  selectedDates$ = this.selectedDatesSubject.asObservable();

  // Method to update the selected dates
  updateSelectedDates(arrivalDate: Date, departureDate: Date): void {
    this.selectedDatesSubject.next({ arrivalDate, departureDate });
  }
}
