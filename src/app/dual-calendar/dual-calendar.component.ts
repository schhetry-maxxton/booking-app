import { Component, OnInit } from '@angular/core';
import { RoomDetails, StayDetails, ReservationDetails } from '../calendar-interface';  // New Interface for Room
import { ReservationService } from '../Services/Reservation2/reservation2.service';
import { EventEmitter, Output } from '@angular/core';

export interface SimplifiedReservation {
  roomId: number;
  arrivalDate: string; // "YYYY-MM-DD"
  departureDate: string; // "YYYY-MM-DD"
}

interface ValidDeparture {
  date: string;    // Departure date in "YYYY-MM-DD"
  stays: StayDetails[];   // Stays that enable this departure date
}

@Component({
  selector: 'app-dual-calendar',
  templateUrl: './dual-calendar.component.html',
  styleUrls: ['./dual-calendar.component.css']
})
export class DualCalendarComponent implements OnInit {
  currentMonth: number;
  nextMonth: number;
  currentYear: number;
  nextYear: number;
  daysInCurrentMonth: { day: number, fromPreviousMonth: boolean }[] = [];
  daysInNextMonth: { day: number, fromPreviousMonth: boolean }[] = [];
  selectedArrivalDate: Date | null = null;
  selectedDepartureDate: Date | null = null;
  today: Date = new Date();
  rooms: RoomDetails[] = []; // Array of rooms with stays (Renamed interface)
  validDepartureDates: Date[] = []; // Combined valid departure dates after arrival selection
  filteredRooms: RoomDetails[] = []; // Store the filtered rooms here

  @Output() selectionConfirmed: EventEmitter<any> = new EventEmitter();

  constructor(
    private reservationService: ReservationService  // Use your ReservationService here
  ) {
    this.currentYear = this.today.getFullYear();
    this.nextYear = this.today.getFullYear();
    this.currentMonth = this.today.getMonth() + 1; // Current month (1-12)
    this.nextMonth = this.currentMonth === 12 ? 1 : this.currentMonth + 1; // Next month
    if (this.currentMonth === 12) {
      this.nextYear += 1; // Handle year increment for next month
    }
  }

  ngOnInit(): void {
    this.generateCalendarDays();
    this.initializeRoomsAndStays();  // Using your service to fetch rooms and stays
  }

  // Fetch and initialize rooms and stays using your ReservationService
  initializeRoomsAndStays(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms.map(room => ({
        ...room,
        stays: stays
          .filter(stay => stay.roomId === room.roomId)  // Ensure we filter stays by roomId
          .map(stay => ({
            stayDateStart: stay.stayDateFrom,  // Keep as string
            stayDateEnd: stay.stayDateTo,      // Keep as string
            roomId: stay.roomId,
            allowedArrivalDays: stay.arrivalDays,        // Rename 'arrivalDays' to 'allowedArrivalDays'
            allowedDepartureDays: stay.departureDays,    // Rename 'departureDays' to 'allowedDepartureDays'
            minStay: stay.minStay,
            maxStay: stay.maxStay,
            bookDateFrom: stay.bookDateFrom,             // No renaming needed
            bookDateTo: stay.bookDateTo,                 // No renaming needed
            minDeviation: stay.minDeviation,             // No renaming needed
            maxDeviation: stay.maxDeviation              // No renaming needed
          }))
      }));
      console.log('Rooms and Stays Initialized:', this.rooms);
    });
  }
  
  

  // Generate calendar days for both months
  generateCalendarDays(): void {
    this.daysInCurrentMonth = this.generateDaysForMonth(this.currentMonth, this.currentYear);
    this.daysInNextMonth = this.generateDaysForMonth(this.nextMonth, this.nextYear);
  }

  // Generates the array of days for the month, including empty cells for days before the first of the month
  generateDaysForMonth(month: number, year: number): { day: number, fromPreviousMonth: boolean }[] {
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const emptyDays = Array.from({ length: firstDayOfMonth }, () => ({ day: 0, fromPreviousMonth: true }));
    const currentMonthDays = Array.from({ length: totalDays }, (_, i) => ({ day: i + 1, fromPreviousMonth: false }));
    return [...emptyDays, ...currentMonthDays];
  }

  // Handle month navigation, adjusting year if needed
  nextMonthClick(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear += 1;
    } else {
      this.currentMonth += 1;
    }

    if (this.nextMonth === 12) {
      this.nextMonth = 1;
      this.nextYear += 1;
    } else {
      this.nextMonth += 1;
    }

    this.generateCalendarDays();
  }

  previousMonthClick(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear -= 1;
    } else {
      this.currentMonth -= 1;
    }

    if (this.nextMonth === 1) {
      this.nextMonth = 12;
      this.nextYear -= 1;
    } else {
      this.nextMonth -= 1;
    }

    this.generateCalendarDays();
  }

 // Generate valid arrival dates for a specific stay
 generateArrivalDates(stay: StayDetails): Set<string> {
  const arrivalDates = new Set<string>();

  // If arrivalDays are missing, allow all days as valid arrival days
  if (!stay.allowedArrivalDays || stay.allowedArrivalDays.length === 0) {
    console.log(`Room ${stay.roomId}: No valid arrival days defined, allowing all days as valid.`);
    stay.allowedArrivalDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Default to all days
  }

  const today = new Date();
  const bookDateFrom = stay.bookingStartDate ? new Date(stay.bookingStartDate) : null;
  const bookDateTo = stay.bookingEndDate ? new Date(stay.bookingEndDate) : null;

  // Ensure today's date falls within the booking window (before considering deviations)
  const isBookable = this.isWithinBookingWindow(today, bookDateFrom, bookDateTo);

  if (!isBookable) {
    console.log(`Room ${stay.roomId} is not bookable today.`);
    return arrivalDates; // If today's date is not within the booking window, return an empty set
  }

  // Handle deviation rules (minDeviation and maxDeviation)
  const minDeviation = stay.minStay ?? 0;
  const maxDeviation = stay.maxStay ?? Infinity;

  // Calculate min/max dates with deviation
  const minDate = new Date(today.getTime() + minDeviation * 24 * 60 * 60 * 1000);
  const maxDate = new Date(today.getTime() + maxDeviation * 24 * 60 * 60 * 1000);

  // Clamp the dates within the booking window
  const effectiveMinDate = bookDateFrom && minDate < bookDateFrom ? bookDateFrom : minDate;
  const effectiveMaxDate = bookDateTo && maxDate > bookDateTo ? bookDateTo : maxDate;

  if (effectiveMaxDate < effectiveMinDate) {
    return arrivalDates; // No valid dates available if the range is invalid
  }

  // Generate valid arrival dates within the effective date range
  for (let date = new Date(effectiveMinDate); date <= effectiveMaxDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = this.getDayOfWeek(date);
    if (stay.allowedArrivalDays.includes(dayOfWeek)) {
      const formattedDate = date.toISOString().split('T')[0];
      arrivalDates.add(formattedDate);
    }
  }

  return arrivalDates;
}
isWithinBookingWindow(today: Date, bookDateFrom: Date | null, bookDateTo: Date | null): boolean {
  // If bookDateFrom is provided, today should not be earlier than bookDateFrom
  const validFrom = !bookDateFrom || today >= bookDateFrom;
  
  // If bookDateTo is provided, today should not be later than bookDateTo
  const validTo = !bookDateTo || today <= bookDateTo;

  // Room is only bookable if both conditions hold true
  return validFrom && validTo;
}

getDayOfWeek(date: Date): string {
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return daysOfWeek[date.getDay()];
}

}
