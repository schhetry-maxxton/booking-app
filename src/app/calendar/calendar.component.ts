import { Component } from '@angular/core';
import { CalendarService } from '../Services/Calendar/calendar.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
  currentMonth: number;
  nextMonth: number;
  currentYear: number;
  nextYear: number;
  daysInCurrentMonth: { day: number, fromPreviousMonth: boolean }[] = [];
  daysInNextMonth: { day: number, fromPreviousMonth: boolean }[] = [];
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  today: Date = new Date();
  arrivalDateDisplay: string = '';
  departureDateDisplay: string = '';

  selectedDays: Set<number> = new Set();  
  nightsDisplay: string = '0 nights'; // Track nights count

  constructor(private calendarService: CalendarService) {
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
  }

  // Generate days for both months, including previous and next month "filler" days
  generateCalendarDays(): void {
    this.daysInCurrentMonth = this.generateDaysForMonth(this.currentMonth, this.currentYear);
    this.daysInNextMonth = this.generateDaysForMonth(this.nextMonth, this.nextYear);
  }

 // Generates the array of days for the month, including empty cells for days before the first of the month
 generateDaysForMonth(month: number, year: number): { day: number, fromPreviousMonth: boolean }[] {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // Find the weekday of the 1st day of the month
  const totalDays = new Date(year, month, 0).getDate(); // Total days in the current month

  // Empty slots for previous days
  const emptyDays = Array.from({ length: firstDayOfMonth }, () => ({
    day: 0,
    fromPreviousMonth: true
  }));

  // Actual days in the current month
  const currentMonthDays = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    fromPreviousMonth: false
  }));

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

// Select start or end date
selectedArrivalDate: Date | null = null;  // Track the selected arrival date
selectedDepartureDate: Date | null = null;  // Track the selected departure date

  // Function to reset the selected dates
  resetSelection(): void {
    this.selectedArrivalDate = null;
    this.selectedDepartureDate = null;
    this.arrivalDateDisplay = '';
    this.departureDateDisplay = '';
    this.nightsDisplay = '0 nights'; // Reset to zero nights
  }

  // Calculate the number of nights based on arrival and departure dates
  getNightsDisplay(): string {
    if (this.selectedArrivalDate && this.selectedDepartureDate) {
      const stayDuration = this.calculateNightStay(this.selectedArrivalDate, this.selectedDepartureDate);
      return `${stayDuration} night${stayDuration > 1 ? 's' : ''}`;
    }
    return '0 nights';  // Default message when no dates are selected
  }

selectDate(day: number, month: number, year: number): void {
    const selectedDate = new Date(year, month - 1, day);  // Create the selected date object

    if (!this.selectedArrivalDate) {
      this.selectedArrivalDate = selectedDate;
      this.selectedArrivalDate.setHours(12, 0, 0, 0); // Set arrival to 12 PM
      this.arrivalDateDisplay = this.formatDate(this.selectedArrivalDate);
      this.departureDateDisplay = ''; // Clear the departure date
    } else if (selectedDate > this.selectedArrivalDate) {
      this.selectedDepartureDate = selectedDate;
      this.selectedDepartureDate.setHours(11, 0, 0, 0); // Set departure to 11 AM
      this.departureDateDisplay = this.formatDate(this.selectedDepartureDate);
    }

    this.nightsDisplay = this.getNightsDisplay(); // Update nights count
  }


  calculateNightStay(arrivalDate: Date, departureDate: Date): number {
    const checkInDate = new Date(arrivalDate);
    checkInDate.setHours(12, 0, 0, 0);  // 12:00 PM
    const checkOutDate = new Date(departureDate);
    checkOutDate.setHours(11, 0, 0, 0);  // 11:00 AM
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);  // Convert to days
    return Math.ceil(daysDiff);  // Return the number of nights
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

getCellClass(dayObj: { day: number, fromPreviousMonth: boolean }, month: number, year: number): string {
  if (dayObj.fromPreviousMonth || dayObj.day === 0) {
    return 'empty-cell';  // Make it non-selectable
  }

  // If the date is disabled
  if (this.isDateLocked(dayObj.day, month, year)) {
    return 'disabled';
  }

  const currentDate = new Date(year, month - 1, dayObj.day);
  currentDate.setHours(12, 0, 0, 0); // Set to noon for comparison

  // If this is the selected arrival day
  if (this.selectedArrivalDate && currentDate.getTime() === this.selectedArrivalDate.getTime()) {
    return 'selected-arrival';
  }

  // Set to 11 AM for the departure comparison
  currentDate.setHours(11, 0, 0, 0); 

  // If this is the selected departure day
  if (this.selectedDepartureDate && currentDate.getTime() === this.selectedDepartureDate.getTime()) {
    return 'selected-departure';
  }

  // If the date is within the selected range
  if (this.selectedArrivalDate && this.selectedDepartureDate &&
      currentDate > this.selectedArrivalDate &&
      currentDate < this.selectedDepartureDate) {
    return 'selected-range';
  }

  return '';  // Default case
}

// Check if a day is selected
isDateSelected(day: number, month: number, year: number): boolean {
  if (day === 0) return false; // Empty cell check

  const date = new Date(year, month - 1, day);

  const isStartDateSelected = this.selectedStartDate && date.getTime() === this.selectedStartDate.getTime();
  const isEndDateSelected = this.selectedEndDate && date.getTime() === this.selectedEndDate.getTime();

  return !!isStartDateSelected || !!isEndDateSelected;
}

// Check if a day is in the selected range
isDateInRange(day: number, month: number, year: number): boolean {
  if (!this.selectedStartDate || !this.selectedEndDate) return false;
  const date = new Date(year, month - 1, day);
  return date > this.selectedStartDate && date < this.selectedEndDate;
}

isDateLocked(day: number, month: number, year: number): boolean {
  const selectedDate = new Date(year, month - 1, day);

  // Set time to noon for the arrival date comparison
  selectedDate.setHours(12, 0, 0, 0);

  // Disable dates before the selected arrival date (12 PM)
  if (this.selectedArrivalDate && selectedDate < this.selectedArrivalDate) {
    return true;
  }

  // Disable past dates (before today at 12 PM)
  const todayWithNoon = new Date(this.today);
  todayWithNoon.setHours(12, 0, 0, 0);
  
  if (selectedDate < todayWithNoon) {
    return true;
  }

  return false;  // Otherwise, the date is enabled
}



// Utility to get the name of the month
  getMonthName(month: number): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1];
  }
  
  saveSelection(): void {
    if (this.selectedArrivalDate && this.selectedDepartureDate) {
      // Push the selected dates to the CalendarService
      this.calendarService.updateSelectedDates(this.selectedArrivalDate, this.selectedDepartureDate);
      console.log("Dates updated in the service: ", this.selectedArrivalDate, this.selectedDepartureDate);
    }
  }

}
