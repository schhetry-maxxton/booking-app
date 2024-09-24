import { Component } from '@angular/core';
import { Router } from '@angular/router'; 

import { IReservation } from '../Interface/ireservation';
import { ReservationService } from '../Services/Reservation2/reservation2.service'; 
import { IRoomWithAvailability } from '../Interface/rooms-with-availability';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';
import { CalendarService } from '../Services/Calendar/calendar.service';

interface ValidDeparture {
  date: string;  // "YYYY-MM-DD"
  availabilities: IRoomAvailability[];  // Availabilities that generated the valid departure date
}

export interface reservationPeriod {
  roomId: number;
  arrivalDate: string; // "YYYY-MM-DD"
  departureDate: string; // "YYYY-MM-DD"
}

@Component({
  selector: 'app-booking-reservation',
  templateUrl: './booking-reservation.component.html',
  styleUrl: './booking-reservation.component.css'
})
export class BookingReservationComponent {
  reservations: IReservation[]=[];
  rooms: IRoomWithAvailability[] = [];  
  filteredRooms: IRoomWithAvailability[] = [];  
  filterForm: FormGroup;
  selectedRoom: IRoomWithAvailability | null = null;  
  currentStep: number = 1; 
  filteredRoomsCount: number | null = null;
  isFilterApplied: boolean = false;
  showPreviousButton: boolean = false; 
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
  validDepartureDates: Date[] = [];
  validArrivalDates: Set<string> = new Set();
  // FvalidDepartureDates: Set<string> = new Set();
  nightsDisplay: string = '0 nights'; // Track nights count
  // validDepartureMap: { [key: string]: { date: string, availabilities: IRoomAvailability[] } } = {};

  selectedDatesDisplay: string | null = null;

  selectedArrivalDate: Date | null = null;  // Track the selected arrival date
  selectedDepartureDate: Date | null = null;  // Track the selected departure date 

  constructor(private reservationService:ReservationService, private fb: FormBuilder,private modalService: NgbModal,
    private calendarService: CalendarService,private router: Router ,
  ){

    this.filterForm = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
      numberOfPersons: [1, [Validators.min(1)]],
    });

    this.currentYear = this.today.getFullYear();
    this.nextYear = this.today.getFullYear();
    this.currentMonth = this.today.getMonth() + 1; // Current month (1-12)
    this.nextMonth = this.currentMonth === 12 ? 1 : this.currentMonth + 1; // Next month

    if (this.currentMonth === 12) {
      this.nextYear += 1; // Handle year increment for next month
    }

  }

  ngOnInit() {
    // Fetch rooms and availability data
    this.reservationService.getRoomsAndStays().subscribe(
      data => {
        this.rooms = this.makeRoomsData(data.rooms, data.stays);
        this.filteredRooms = [];
        // this.generateValidArrivalDates();  
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
    this.reservations = this.reservationService.getReservations();
    this.generateCalendarDays();
    // this.generateValidArrivalDates();
  }
  

  isPreviousDisabled(): boolean {
    return this.currentMonth === this.today.getMonth() + 1 && this.currentYear === this.today.getFullYear();
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
  this.showPreviousButton = true;
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
  this.showPreviousButton = this.currentMonth !== this.today.getMonth() + 1 || this.currentYear !== this.today.getFullYear();
  this.generateCalendarDays();
}

  // Function to reset the selected dates
  resetSelection(): void {
    this.selectedArrivalDate = null;
    this.selectedDepartureDate = null;
    this.arrivalDateDisplay = '';
    this.departureDateDisplay = '';
    this.nightsDisplay = '0 nights'; // Reset to zero nights
    this.selectedDatesDisplay = 'When do you want to go?';
  
    // Clear the form values
    this.filterForm.patchValue({
      dateFrom: '',
      dateTo: ''
    });
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
  
    // Convert selectedDate to "YYYY-MM-DD" for comparison with validArrivalDates
    const selectedDateString = selectedDate.toISOString().split('T')[0];
  
    // If no arrival date is selected, check if the selected date is a valid arrival date
    if (!this.selectedArrivalDate) {
      console.log("step 2:  inside !this.selectedArrivalDate && this.validArrivalDates.has(selectedDateString) ");
      
      this.selectedArrivalDate = selectedDate;
      this.selectedArrivalDate.setHours(12, 0, 0, 0); 
      console.log('Selected Arrival Date:', this.formatDate(this.selectedArrivalDate));
      this.arrivalDateDisplay = this.formatDate(this.selectedArrivalDate);
      this.departureDateDisplay = '';  // Clear the departure date
      this.nightsDisplay = '0 nights';  // Reset nights display
      this.selectedDepartureDate = null;  // Clear any previously selected departure date
      // this.generateValidDepartureDates();  // Populate valid departure dates based on the selected arrival date
      const { validDepartureDates, validDepartureMap } = this.calculateValidDepartureDatesForArrival(this.selectedArrivalDate);
      this.validDepartureDates = validDepartureDates;
      this.validDepartureMap = validDepartureMap;
      console.log('Valid Departure Dates:', this.validDepartureDates.map(date => this.formatDate(date)));  // Exit the function since the arrival date has been set
    }
  
    // If an arrival date is already selected and the selected date is after the arrival date
    else if (this.selectedArrivalDate && selectedDate > this.selectedArrivalDate) {
      this.selectedDepartureDate = selectedDate;
      this.selectedDepartureDate.setHours(11, 0, 0, 0);
      this.departureDateDisplay = this.formatDate(this.selectedDepartureDate);
      this.nightsDisplay = this.getNightsDisplay();  // Calculate and display the number of nights
      return;  // Exit the function since the departure date has been set
    }
  
    this.generateCalendarDays(); 
    // If no valid selection, don't modify anything
    // console.log('Selected date is not valid for arrival or departure.');
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

  
// Utility to get the name of the month
getMonthName(month: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[month - 1];
}


  formatDate(date: Date): string {
    const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`; 
    
  }

getCellClass(dayObj: { day: number, fromPreviousMonth: boolean }, month: number, year: number): string {

  const date = new Date(year, month - 1, dayObj.day);  // Create date object for the current cell
  const currentDate=this.formatDate(date);

  if (dayObj.fromPreviousMonth || dayObj.day === 0) {
    return 'empty-cell';  // Non-selectable empty cells
  }

  if (date < this.today) {
    console.log("");
    
    return 'disabled';
}
  // currentDate.setHours(12, 0, 0, 0);  // Set to 12:00 PM for consistent comparison

  if (!this.selectedArrivalDate) {
    const validArrivalDates = this.generateCombinedArrivalDates();  // Get valid arrival dates
    if (validArrivalDates.has(currentDate)) {
      return 'available-arrival';  // Highlight valid arrival dates
    }
    return 'disabled';
  }

  if (this.selectedArrivalDate && currentDate === this.formatDate(this.selectedArrivalDate)) {
    return 'selected-arrival';
  }

  if (this.selectedDepartureDate && currentDate === this.formatDate(this.selectedDepartureDate)) {
    return 'selected-departure';
  }

  if (this.selectedArrivalDate && this.selectedDepartureDate && date > this.selectedArrivalDate && date < this.selectedDepartureDate) {
    return 'selected-range';
}

const isValidDeparture = this.isValidDateInRange(date);
if (isValidDeparture) {
    return 'selected-arrival';
}

// If it's none of the above, disable the date
return 'disabled';
}


isValidDateInRange(date: Date): boolean {
  const newlyformattedDate = this.formatDate(date); // Convert the date to 'yyyy-mm-dd' format
  const validDates = this.validDepartureDates.map(d => this.formatDate(d)); // Convert valid dates to 'yyyy-mm-dd'
  
  const isValid = validDates.includes(newlyformattedDate);
  
  return isValid;
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

validDepartureMap: ValidDeparture[] = [];

calculateValidDepartureDatesForArrival(arrivalDate: Date): {
  validDepartureDates: Date[], 
  validDepartureMap: ValidDeparture[]
} {
  const validDepartureDates: Date[] = [];
  const validDepartures: ValidDeparture[] = [];

  // Iterate through each room and its stays
  this.rooms.forEach(room => {
    room.availabilities.forEach(avail => {
      // Ensure the stay allows the selected arrival date
      if (this.isValidArrivalDate(arrivalDate, avail)) {
        // First, check if the stay is within the booking window before proceeding
        const today = new Date();
        const bookDateFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
        const bookDateTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;

        // If today's date is not within the booking window, skip this stay
        if (!this.isWithinBookingWindow(today, bookDateFrom, bookDateTo)) {
          return; // Skip this stay as it is not bookable based on the booking window
        }

        // Calculate the valid departure dates for this specific stay
        const departureDates = this.calculateValidDepartureDates(arrivalDate, avail);

        // Filter the valid departure dates using the `filterOutReservedDates` function
        const filteredDepartureDates = this.filterOutReservedDates(departureDates, avail.roomId);

        // For each valid and filtered departure date
        filteredDepartureDates.forEach(departureDate => {
          const formattedDepartureDate = this.formatDate(departureDate);

          // Check if this date already exists in the validDepartures array
          let existingDeparture = validDepartures.find(vd => vd.date === formattedDepartureDate);

          if (existingDeparture) {
            // If the date already exists, just add the stay to the list
            existingDeparture.availabilities.push(avail);
          } else {
            // If the date doesn't exist, create a new entry
            validDepartures.push({
              date: formattedDepartureDate,
              availabilities: [avail]
            });
          }

          validDepartureDates.push(departureDate); // Add the valid date to the array
        });
      }
    });
  });

  // Remove duplicate dates in validDepartureDates
  const uniqueDepartureDates = Array.from(new Set(validDepartureDates.map(date => date.getTime()))).map(time => new Date(time));

  return {
    validDepartureDates: uniqueDepartureDates,
    validDepartureMap: validDepartures
  };
}

filterOutReservedDates(validDates: Date[], roomId: number): Date[] {
  const reservations = this.reservationService.getReservations()
    .filter(res => res.roomId === roomId)
    .map(res => ({
      arrivalDate: new Date(res.arrivalDate),
      departureDate: new Date(res.departureDate)
    }));

  return validDates.filter(date => {
    return !reservations.some(reservation => {
      const checkOutTime = 11 * 60 * 60 * 1000;  // 10:00 AM in milliseconds
      const checkInTime = 12 * 60 * 60 * 1000;   // 11:00 AM in milliseconds

      const reservationStart = new Date(reservation.arrivalDate.getTime() - checkInTime); // Reservation start
      const reservationEnd = new Date(reservation.departureDate.getTime() + checkOutTime); // Reservation end

      // Case 1: Overlap check (already handled)
      if (date >= reservationStart && date <= reservationEnd) {
        console.log(`Date ${date.toDateString()} overlaps with a reservation (from ${reservation.arrivalDate.toDateString()} to ${reservation.departureDate.toDateString()}).`);
        return true;  // This date overlaps with the reservation, so it's invalid.
      }

      // Case 2: Engulfing check (new)
      // Ensure the selected arrival date + departure date doesn't engulf the reservation.
      // Engulfing: Arrival is before the reservation start and departure is after the reservation end.
      if (this.selectedArrivalDate && this.selectedArrivalDate < reservation.arrivalDate && date > reservation.departureDate) {
        console.log(`Date ${date.toDateString()} engulfs a reservation (from ${reservation.arrivalDate.toDateString()} to ${reservation.departureDate.toDateString()}).`);
        return true;  // This date engulfs the reservation, so it's invalid.
      }
      if (this.selectedArrivalDate && this.selectedArrivalDate > reservation.arrivalDate && this.selectedArrivalDate<=reservation.departureDate && date > reservation.departureDate) {
        console.log(`Date ${date.toDateString()} engulfs a reservation (from ${reservation.arrivalDate.toDateString()} to ${reservation.departureDate.toDateString()}).`);
        return true;  // This date engulfs the reservation, so it's invalid.
      }

      // Case 3: Same-day check-in/out allowed (still valid)
      if (date.getTime() === reservation.arrivalDate.getTime()) {
        console.log(`Date ${date.toDateString()} is valid for same-day check-out and check-in.`);
        return false;  // This date is valid.
      }

      return false;  // If none of the conditions apply, the date is valid.
    });
  });
}


isValidArrivalDate(arrivalDate: Date, avail: IRoomAvailability): boolean {
  // Convert stayDateFrom and stayDateTo to Date objects if they are strings
  const stayDateFrom = new Date(avail.stayDateFrom);
  const stayDateTo = new Date(avail.stayDateTo);
  
  if (!stayDateFrom || !stayDateTo) {
    console.log(`Stay dates are missing for room ${avail.roomId}`);
    return false;
  }

  const arrivalDay = this.getDayOfWeek(arrivalDate); // Get the arrival day (e.g., MON)
  
  // Check if the arrivalDate is within the stay's range and on a valid arrival day
  return (
    this.isDateWithinRange(arrivalDate, stayDateFrom, stayDateTo) &&
    avail.arrivalDays.includes(arrivalDay)
  );
}

isDateWithinRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

calculateValidDepartureDates(arrivalDate: Date, avail: IRoomAvailability): Date[] {
  const validDates: Date[] = [];

  // Simplified reservations for this room
  const reservations: reservationPeriod[] = this.getRoomReservations(avail.roomId);

  const stayDateFrom = new Date(avail.stayDateFrom);
  const stayDateTo = new Date(avail.stayDateTo);

  if (!avail.departureDays || avail.departureDays.length === 0) {
    avail.departureDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Default to all days
  }

  // Apply the booking window constraints before calculating valid departure dates
  const today = new Date();
  const bookDateFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
  const bookDateTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;

  if (!this.isWithinBookingWindow(today, bookDateFrom, bookDateTo)) {
    console.log(`Stay for Room ${avail.roomId} is not bookable today. Skipping departure date calculation.`);
    return validDates; // Skip if the stay doesn't fall within the booking window
  }

  for (let i = avail.minStay; i <= avail.maxStay; i++) {
    const candidateDepartureDate = new Date(arrivalDate);
    candidateDepartureDate.setDate(arrivalDate.getDate() + i);

    if (candidateDepartureDate <= stayDateTo && candidateDepartureDate >= stayDateFrom) {
      if (this.isValidDepartureDay(candidateDepartureDate, avail)) {
        validDates.push(candidateDepartureDate);
      }
    }
  }

  // Apply filtering for reservations that conflict with the valid departure dates
  return this.filterOutReservedDates(validDates, avail.roomId);
}

isValidDepartureDay(date: Date, avail: IRoomAvailability): boolean {
  const dayOfWeek = this.getDayOfWeek(date); // Get day as MON, TUE, etc.
  return avail.departureDays.includes(dayOfWeek); // Check if the departure day is valid
}

  saveSelection(): void {
    if (this.selectedArrivalDate && this.selectedDepartureDate) {
      // Patch the form values with the selected dates
      this.filterForm.patchValue({
        dateFrom: this.selectedArrivalDate.toISOString().split('T')[0],
        dateTo: this.selectedDepartureDate.toISOString().split('T')[0]
      });
  
      // Update the selectedDatesDisplay with formatted dates
      this.selectedDatesDisplay = `${this.formatDate(this.selectedArrivalDate)} - ${this.formatDate(this.selectedDepartureDate)}`;
  
      // Close the calendar modal
      const calendarModal = document.getElementById('CalendarModal');
      if (calendarModal) {
        const modalInstance = bootstrap.Modal.getInstance(calendarModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
  
      // Explicitly remove the modal backdrop
      const modalBackdrop = document.querySelector('.modal-backdrop');
      if (modalBackdrop) {
        modalBackdrop.remove();  // Manually remove the modal backdrop
      }
  
      // Open the reservation filter modal to allow guest selection
      const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal')!);
      reservationModal.show();
    }
  }

  closeCalendarModal(): void {
    const calendarModal = document.getElementById('CalendarModal');
    if (calendarModal) {
      const modalInstance = bootstrap.Modal.getInstance(calendarModal);
      if (modalInstance) {
        modalInstance.hide();  // Close the calendar modal
      }
    }
  
    // Remove the backdrop manually if it still exists
    const modalBackdrop = document.querySelector('.modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.remove();
    }
  
    // Reopen the filter modal after closing the calendar modal
    this.openFilterModal();
  }
  
  isCheckInAvailable(reservation: IReservation): boolean {
    const todayStr = this.formatDate(this.today);
    const arrivalStr = this.formatDate(reservation.arrivalDate);
    return todayStr === arrivalStr && reservation.status === 'CONFIRM';
  }

  // Check if today is the departure date, enabling "Check-Out"
  isCheckOutAvailable(reservation: IReservation): boolean {
    const todayStr = this.formatDate(this.today);
    const departureStr = this.formatDate(reservation.departureDate);
    return todayStr === departureStr && reservation.status === 'CHECKED-IN';
  }


    onStatusChange(reservation: IReservation): void {
      try {
        this.reservationService.updateReservationStatus(reservation);
        console.log('Reservation status updated successfully', reservation.status);
        setTimeout(() => {
          this.router.navigate(['/planningchart']);
        }, 2000); 
      } catch (error) {
        console.error('Error updating reservation status', error);
      }
    }

    // onStatusChange(reservation: IReservation): void {
    //   const todayStr = this.formatDate(this.today); // Format today’s date
    //   const arrivalStr = this.formatDate(reservation.arrivalDate);
    //   const departureStr = this.formatDate(reservation.departureDate);
    
    //   // Check if the status change is valid based on the current date
    //   if (reservation.status === 'CHECKED-IN' && todayStr !== arrivalStr) {
    //     console.error('Check-in is only allowed on the arrival date.');
    //   } else if (reservation.status === 'CHECKED-OUT' && todayStr !== departureStr) {
    //     console.error('Check-out is only allowed on the departure date.');
    //   } else {
    //     // If the date is valid, proceed with status update
    //     this.updateReservationStatusWithRedirect(reservation);
    //   }
    // }
    
    // updateReservationStatusWithRedirect(reservation: IReservation): void {
    //   try {
    //     this.reservationService.updateReservationStatus(reservation);
    //     console.log('Reservation status updated successfully:', reservation.status);
    
    //     // Delay for 2 seconds before navigating to the Gantt chart
    //     setTimeout(() => {
    //       this.router.navigate(['/planningchart']);
    //     }, 2000);
    //   } catch (error) {
    //     console.error('Error updating reservation status', error);
    //   }
    // }

    removeReservation(reservationId: number): void{
      this.reservationService.clearReservationById(reservationId);
      this.ngOnInit();
    }

    makeRoomsData(rooms: IRoomWithAvailability[], availabilities: IRoomAvailability[]): IRoomWithAvailability[] {
      console.log('Rooms Data:', rooms); 
  
      // Step 1: Create a map to associate rooms by roomId, and initialize an empty availabilities array for each room
      const roomMap = new Map<number, IRoomWithAvailability>();
      
      rooms.forEach(room => {
        room.availabilities = [];  // Initialize the availabilities array for each room
        roomMap.set(room.roomId, room);  // Map the room by its roomId
      });
      
      console.log('Room Map after initialization:', roomMap);  // Log room map after initializing
  
      
      availabilities.forEach(avail => {
        const room = roomMap.get(avail.roomId);  // Find the room by roomId
        
        if (room) {
          room.availabilities.push(avail);  // Add the availability to the correct room
        }
      });
  
      // Log the final room data after combining with availabilities
      console.log('Room Map after merging availabilities:', roomMap);
     
      // Step 3: Return the array of rooms with their availabilities combined
      return Array.from(roomMap.values());  // Convert the Map back into an array of rooms
      
    }

    isBookingAllowed(): boolean {
      const checkInDate = this.filterForm.get('dateFrom')?.value;
      const checkOutDate = this.filterForm.get('dateTo')?.value;
      return checkInDate && checkOutDate; // Returns true only if both dates are filled
    }

    applyFilters(): void {
      const filters = this.filterForm.value;
      const stayDateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const stayDateTo = filters.dateTo ? new Date(filters.dateTo) : null;
    
      if (!stayDateFrom || !stayDateTo || !filters.numberOfPersons) {
        this.filteredRooms = [];
        this.isFilterApplied = false;
        return;
      }
    
      // Get unavailable room IDs due to overlapping reservations
      const unavailableRoomIds = this.getUnavailableRooms(stayDateFrom, stayDateTo);
    
      // Filter rooms based on availability and user-selected criteria
      this.filteredRooms = this.rooms.flatMap(room => {
        if (unavailableRoomIds.includes(room.roomId)) {
          return [];  // Exclude rooms with overlapping reservations
        }
    
        // Filter availabilities based on booking range, stay duration, capacity, arrival/departure days
        const matchedAvailabilities = room.availabilities.filter(avail => {
          let bookFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
          let bookTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;
    
          // If `bookFrom` is missing, assume the room can be booked from any date (including today)
          if (!bookFrom) {
            bookFrom = new Date();  // Set to today's date if `bookDateFrom` is missing
          }
    
          // If `bookTo` is missing, assume the room can be booked indefinitely (no upper limit)
          if (!bookTo) {
            bookTo = new Date('2024-12-31');  // Arbitrary far-future date for "unlimited" booking end
          }
    
          // Check if stayDateFrom and stayDateTo fall within the booking range
          const isWithinBookingPeriod = (stayDateFrom >= bookFrom && stayDateTo <= bookTo);
          if (!isWithinBookingPeriod) {
            return false;  // Skip if the selected dates are not within the booking period
          }
    
          // Check minStay/maxStay for valid stay duration
          const stayDuration = (stayDateTo.getTime() - stayDateFrom.getTime()) / (1000 * 3600 * 24);
          const isValidStay = this.isWithinStayDuration(stayDuration, avail.minStay, avail.maxStay);
          if (!isValidStay) {
            return false;
          }
    
          // Validate arrival and departure days based on the selected arrival date
          const arrivalDay = stayDateFrom.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const departureDay = stayDateTo.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const isValidArrivalDay = avail.arrivalDays.includes(arrivalDay);
          const isValidDepartureDay = this.isValidDepartureDay( stayDateTo, avail);
    
          if (!isValidArrivalDay || !isValidDepartureDay) {
            return false;
          }
    
          // Check room capacity
          return room.guestCapacity >= filters.numberOfPersons;
        });
    
        if (matchedAvailabilities.length === 0) {
          return [];
        }
    
        return { ...room };
      });
    
      this.filteredRoomsCount = this.filteredRooms.length;
      this.isFilterApplied = true;
      this.closeFilterModal();
    }
    
    
    
    // isValidDepartureDay(arrivalDate: Date, departureDate: Date, availability: IRoomAvailability): boolean {
    //   const stayDuration = (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24); // Calculate stay duration in days
      
    //   // Validate that the stay duration is within the minStay and maxStay range
    //   if (stayDuration < availability.minStay || stayDuration > availability.maxStay) {
    //     console.log(`Invalid stay duration: ${stayDuration} days (Min: ${availability.minStay}, Max: ${availability.maxStay})`);
    //     return false;
    //   }
    
    //   // Check that the selected departure day matches one of the room's valid departure days
    //   const departureDay = departureDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    //   return availability.departureDays.includes(departureDay);
    // }
    
    
    getUnavailableRooms(stayDateFrom: Date, stayDateTo: Date): number[] {
      return this.reservations
        .filter(reservation => {
          const reservationStart = new Date(reservation.arrivalDate);
          const reservationEnd = new Date(reservation.departureDate);
          
          // Adjust the times for proper comparison:
          // Reservations start at 12:00 PM (Check-In)
          reservationStart.setHours(12, 0, 0, 0); 
          // Reservations end at 11:00 AM (Check-Out)
          reservationEnd.setHours(11, 0, 0, 0);
    
          // Check if the reservation overlaps with the selected stay date range,
          // but also respect the times for Check-In (12:00 PM) and Check-Out (11:00 AM)
          return this.isDateRangeOverlapping(stayDateFrom, stayDateTo, reservationStart, reservationEnd);
        })
        .map(reservation => reservation.roomId);  // Return the room IDs of unavailable rooms
    }
    
  
    // isCapacityMatch(room: IRoomWithAvailability, filters: any): boolean {
    //   const numberOfPersons = filters.numberOfPersons || 1;
    //   return room.guestCapacity >= numberOfPersons;
    // }

    private isWithinStayDuration(duration: number, minStay: number, maxStay: number): boolean {

      return (duration >= minStay && duration <= maxStay);
    }

    private isDateRangeOverlapping(
      stayDateFrom: Date,
      stayDateTo: Date,
      reservationStart: Date,
      reservationEnd: Date
    ): boolean {
      // If the stay's arrival date overlaps with the reservation's date range
      // but also consider that on the reservation's departure date, the room is free after 11:00 AM
      if (stayDateFrom < reservationEnd && stayDateTo > reservationStart) {
        // Special case: if the stay date overlaps with the departure date, ensure it's after 11:00 AM
        if (stayDateFrom.toDateString() === reservationEnd.toDateString()) {
          // Stay date is on the reservation's departure date; allow if it’s after 11:00 AM
          return stayDateFrom.getTime() < reservationEnd.getTime(); // Before 11:00 AM
        }
        return true; // Otherwise, it's fully overlapping
      }
    
      return false; // No overlap
    }
    

    openReservationModal(room: IRoomWithAvailability): void {
      this.selectedRoom = room;
    
      // Ensure that the room has availabilities
      if (room.availabilities.length > 0) {
        // Set the min and max dates for the check-in and check-out based on room availability
        const availableFrom = new Date(room.availabilities[0].stayDateFrom);
        const availableTo = new Date(room.availabilities[0].stayDateTo);
        
        // Pre-populate the form fields with the filter values (check-in, check-out, and guests)
        const dateFrom = this.filterForm.get('dateFrom')?.value ? new Date(this.filterForm.get('dateFrom')?.value) : availableFrom;
        const dateTo = this.filterForm.get('dateTo')?.value ? new Date(this.filterForm.get('dateTo')?.value) : availableTo;
        const numberOfPersons = this.filterForm.get('numberOfPersons')?.value || 1;
    
        // Set the form fields with these values
        this.filterForm.patchValue({
          dateFrom: dateFrom.toISOString().split('T')[0], // Setting as yyyy-MM-dd for the date input
          dateTo: dateTo.toISOString().split('T')[0], // Setting as yyyy-MM-dd for the date input
          numberOfPersons: numberOfPersons
        });
      }
    
      // Now show the modal
      const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal')!);
      reservationModal.show();
    }

    openBookingModal(room: IRoomWithAvailability): void {
      this.selectedRoom = room;
  
      if (room.availabilities.length > 0) {
        const availableFrom = new Date(room.availabilities[0].stayDateFrom);
        const availableTo = new Date(room.availabilities[0].stayDateTo);
  
        const dateFrom = this.filterForm.get('dateFrom')?.value
          ? new Date(this.filterForm.get('dateFrom')?.value)
          : availableFrom;
  
        const dateTo = this.filterForm.get('dateTo')?.value
          ? new Date(this.filterForm.get('dateTo')?.value)
          : availableTo;
  
        this.filterForm.patchValue({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        });
  

        const numberOfPersons = this.filterForm.get('numberOfPersons')?.value || 1;

        console.log(" numberOfPersons", numberOfPersons);
        
        const modalRef = this.modalService.open(ModalComponent);
        modalRef.componentInstance.bookingDetails = {
          roomId: room.roomId,
          arrivalDate: dateFrom,
          departureDate: dateTo,
          pricePerDayPerPerson: room.pricePerDayPerPerson,
          roomName: room.roomName,
          numberOfPersons: numberOfPersons 
        };
  
        // Only close the modal, do not reset anything here
        modalRef.result.then(
          result => {
            console.log('Modal closed successfully.');
          },
          reason => {
            console.log('Modal dismissed:', reason);
          }
        );
      }
    }

    openFilterModal(): void {
      // Reset the filter form when opening the modal
      this.filterForm.reset({
        dateFrom: '',
        dateTo: '',
        numberOfPersons: 1  // Reset to default value
      });
  
      this.resetSelection();
      
      // Show the filter modal (for selecting date and number of persons)
      const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal')!);
      reservationModal.show();
    }
  
    closeBookingModal(): void {
      const bookingModal = document.getElementById('bookingModal');
      if (bookingModal) {
        const modalInstance = bootstrap.Modal.getInstance(bookingModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
  
      const modalBackdrop = document.querySelector('.modal-backdrop');
      
      if (modalBackdrop) {
        modalBackdrop.remove();  // Manually remove the modal backdrop
      }
      // No reset or filtered rooms action here, just close the modal
    }
  
    /**
     * Closes the filter modal after applying filters.
     * Resets the filter form only when the filter modal is reopened.
     */
    closeFilterModal(): void {
      const reservationModal = document.getElementById('reservationModal');
      
      if (reservationModal) {
        const modalInstance = bootstrap.Modal.getInstance(reservationModal);
        if (modalInstance) {
          modalInstance.hide();  // Ensure modal is closed properly
        }
      }
    
      // Remove the modal backdrop explicitly to avoid the hazy screen issue
      const modalBackdrop = document.querySelector('.modal-backdrop');
      if (modalBackdrop) {
        modalBackdrop.remove();  // Manually remove the modal backdrop
      }
    }
    
    generateValidArrivalDates(avail: IRoomAvailability): Set<string> {
      const arrivalDates = new Set<string>();
    
      // If arrivalDays are missing, allow all days as valid arrival days
      if (!avail.arrivalDays || avail.arrivalDays.length === 0) {
        console.log(`Room ${avail.roomId}: No valid arrival days defined, allowing all days as valid.`);
        avail.arrivalDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Default to all days
      }
    
      const today = new Date();
      const bookDateFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
      const bookDateTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;
    
      // Ensure today's date falls within the booking window (before considering deviations)
      const isBookable = this.isWithinBookingWindow(today, bookDateFrom, bookDateTo);
    
      if (!isBookable) {
        // console.log(`Room ${avail.roomId} is not bookable today.`);
        return arrivalDates; // If today's date is not within the booking window, return an empty set
      }
    
      // Handle deviation rules (minDeviation and maxDeviation)
      const minDeviation = avail.minDeviation ?? 0;
      const maxDeviation = avail.maxDeviation ?? Infinity;
    
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
        if (avail.arrivalDays.includes(dayOfWeek)) {
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
    
    
    generateCombinedArrivalDates(): Set<string> {
      const combinedDates = new Set<string>();
    
      console.log(`\n\n=== Generating Combined Arrival Dates for All Rooms ===`);
    
      this.rooms.forEach(room => {
        room.availabilities.forEach(avail => {
          
          const stayDates = this.generateValidArrivalDates(avail);
          stayDates.forEach(date => {
            combinedDates.add(date);
          });
        });
      });
    
      console.log('\n=== Final Combined Arrival Dates ===');
      console.log(Array.from(combinedDates));
      console.log('====================================\n');
    
      return combinedDates;
    }
  
    // Step 3: Reservation check for overlapping dates
    // isDateReserved(roomId: number, date: Date): boolean {
    //   return this.reservations.some(reservation => {
    //     return (
    //       reservation.roomId === roomId &&
    //       new Date(reservation.arrivalDate) <= date &&
    //       new Date(reservation.departureDate) >= date
    //     );
    //   });
    // }

    isDateReserved(roomId: number, date: Date): boolean {
      return this.reservations.some(reservation => {
        if (reservation.roomId !== roomId) {
          return false;  // If the reservation is not for the current room, skip it
        }
        // console.log("checking reservation for ",roomId);
        
        const arrivalDate = new Date(reservation.arrivalDate);
        const departureDate = new Date(reservation.departureDate);
    
        // Set the hours to explicitly define check-in and check-out times
        arrivalDate.setHours(12, 0, 0, 0);   // Check-in starts at 12:00 PM
        departureDate.setHours(11, 0, 0, 0); // Check-out is by 11:00 AM
    
        // Check if the selected date is within the reservation period
        if (date.getTime() >= arrivalDate.getTime() && date.getTime() <= departureDate.getTime()) {
          // If the selected date is the departure date, we only block until 11:00 AM
          if (date.toDateString() === departureDate.toDateString()) {
            return date.getTime() < departureDate.getTime();  // Only block till 11:00 AM
          }
          return true;  // Block if within the reservation period
        }
    
        return false;  // If no matching reservation, the date is not reserved
      });
    }
    
  
    // generateValidDepartureDates(): void {
    //   if (!this.selectedArrivalDate) {
    //     console.error("No arrival date selected.");
    //     return;
    //   }
    
    //   const selectedArrivalDate = new Date(this.selectedArrivalDate);
    //   this.validDepartureDates.clear();  // Clear previous departure dates
    //   this.validDepartureMap = {};  // Initialize or clear the valid departure map
    
    //   this.rooms.forEach(room => {
    //     room.availabilities.forEach(avail => {
    //       // Check if the selected arrival date is valid for the availability
    //       if (this.isValidArrivalForAvailability(selectedArrivalDate, avail)) {
    //         const minStay = avail.minStay || 1; // Default to 1 night if minStay is null
    //         const maxStay = avail.maxStay || 365; // Default to 365 days if maxStay is null
    
    //         // Calculate the valid range of departure dates based on minStay and maxStay
    //         const minDepartureDate = new Date(selectedArrivalDate);
    //         minDepartureDate.setDate(minDepartureDate.getDate() + minStay); // Earliest departure based on minStay
    
    //         const maxDepartureDate = new Date(selectedArrivalDate);
    //         maxDepartureDate.setDate(maxDepartureDate.getDate() + maxStay); // Latest departure based on maxStay
    
    //         // Check if the departure dates are within the stayDateFrom and stayDateTo range
    //         const stayFrom = avail.stayDateFrom ? new Date(avail.stayDateFrom) : new Date(); // Default to today
    //         const stayTo = avail.stayDateTo ? new Date(avail.stayDateTo) : new Date('2099-12-31'); // Default to far future
    
    //         // Clamp the departure dates within the stay range
    //         const finalMinDeparture = minDepartureDate > stayFrom ? minDepartureDate : stayFrom; // Earliest valid departure
    //         const finalMaxDeparture = maxDepartureDate < stayTo ? maxDepartureDate : stayTo; // Latest valid departure
    
    //         // Loop through the valid range of departure dates
    //         for (let date = new Date(finalMinDeparture); date <= finalMaxDeparture; date.setDate(date.getDate() + 1)) {
    //           const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    
    //           // Check if the day is valid for departure and no reservations exist on this date
    //           if (avail.departureDays.includes(dayOfWeek) && !this.isDateReserved(room.roomId, date)) {
    //             const formattedDate = date.toISOString().split('T')[0];
    
    //             // Add the valid departure date
    //             this.validDepartureDates.add(formattedDate);
    
    //             // Add to the valid departure map
    //             if (!this.validDepartureMap[formattedDate]) {
    //               this.validDepartureMap[formattedDate] = {
    //                 date: formattedDate,
    //                 availabilities: []
    //               };
    //             }
    //             this.validDepartureMap[formattedDate].availabilities.push(avail);  // Track which availabilities generated this departure date
    //           }
    //         }
    //       }
    //     });
    //   });
    
    //   console.log("Valid Departure Dates:", Array.from(this.validDepartureDates));
    //   console.log("Valid Departure Map:", this.validDepartureMap);
    // }
    
    // generateValidDepartureDates(): void {
    //   console.log(" Step 3: inside generate valid departure days ");
      
    //   if (!this.selectedArrivalDate) {
    //     console.error("No arrival date selected.");
    //     return;
    //   }
    
    //   const selectedArrivalDate = new Date(this.selectedArrivalDate);
    //   // console.log(" selected arrival date ", this.selectedArrivalDate);
      
    //   this.validDepartureDates.clear();  // Clear previous departure dates
    //   const validDepartureMap: { [key: string]: IRoomAvailability[] } = {};  // Map to track departure dates and their availabilities
    //   // console.log(" validDepartureMap ", validDepartureMap);
      
    //   this.rooms.forEach(room => {
    //     room.availabilities.forEach(avail => {
    //       // Check if this availability allows the selected arrival date
    //       if (this.isValidArrivalForAvailability(selectedArrivalDate, avail)) {
    //         console.log(" checking if the selected arrival days is valid or not ",  this.isValidArrivalForAvailability(selectedArrivalDate, avail), ' for ', avail.roomId);
            
    //         const minStay = avail.minStay;
    //         const maxStay = avail.maxStay;
    
    //         // Calculate the earliest and latest valid departure dates based on min/max stay
    //         const minDepartureDate = new Date(selectedArrivalDate);
    //         minDepartureDate.setDate(minDepartureDate.getDate() + minStay);  // Min stay departure
    
    //         const maxDepartureDate = new Date(selectedArrivalDate);
    //         maxDepartureDate.setDate(maxDepartureDate.getDate() + maxStay);  // Max stay departure
    
    //         const stayFrom = new Date(avail.stayDateFrom);
    //         const stayTo = new Date(avail.stayDateTo);
    
    //         // Handle open-ended `bookDateFrom` and `bookDateTo`
    //         const bookFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
    //         const bookTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;
    
    //         // Skip if the selected arrival is before the bookable period
    //         if (bookFrom && selectedArrivalDate < bookFrom) {
    //           console.log(" skipp arrival dated because not in bookable range");
    //           return;
    //         }
    
    //         // Calculate final max departure, ensuring `bookDateTo` is respected
    //         const finalMaxDeparture = bookTo ? new Date(Math.min(maxDepartureDate.getTime(), bookTo.getTime())) : maxDepartureDate;
    
    //         // Adjust for `stayDateFrom` and `stayDateTo`
    //         const effectiveMinDeparture = minDepartureDate < stayFrom ? stayFrom : minDepartureDate;
    //         const effectiveMaxDeparture = maxDepartureDate > stayTo ? stayTo : finalMaxDeparture;
    
    //         // Loop through the effective departure range and find valid departure days
    //         for (let date = new Date(effectiveMinDeparture); date <= effectiveMaxDeparture; date.setDate(date.getDate() + 1)) {
    //           const dayOfWeek = this.getDayOfWeek(date);  // Get the weekday
    
    //           // Handle cases where `departureDays` is empty by defaulting to all days
    //           if (!avail.departureDays || avail.departureDays.length === 0) {
    //             avail.departureDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Default to all days
    //           }
    
    //           // Skip dates that are outside the booking window
    //           if (bookFrom && date < bookFrom) {
    //             continue;  // Skip dates before `bookDateFrom`
    //           }
    //           if (bookTo && date > bookTo) {
    //             continue;  // Skip dates after `bookDateTo`
    //           }
    
    //           // Check if the room is reserved on the current departure date
    //           if (!this.isDateReserved(room.roomId, date)) {
    //             // Check if this day is a valid departure day
    //             console.log("inside check of is the departure date reserved for room", room.roomId);
                
    //             if (avail.departureDays.includes(dayOfWeek)) {
    //               const formattedDate = date.toISOString().split('T')[0];
    //               this.validDepartureDates.add(formattedDate);
    
    //               // Add this availability to the map for the departure date
    //               if (!validDepartureMap[formattedDate]) {
    //                 validDepartureMap[formattedDate] = [];
    //               }
    //               validDepartureMap[formattedDate].push(avail);  // Store the availability for the departure date
    //             }
    //           } else {
    //             console.log(`Skipping date ${date} as room ${room.roomId} is already reserved.`);
    //           }
    //         }
    //       }
    //     });
    //   });
    
    //   console.log("Valid Departure Dates:", Array.from(this.validDepartureDates));
    //   console.log("Valid Departure Map:", validDepartureMap);
    // }
    
    getRoomReservations(roomId: number): reservationPeriod[] {
      const Reservations: reservationPeriod[] = this.reservationService.getReservations()
        .filter(res => res.roomId === roomId)
        .map(res => ({
          roomId: res.roomId,
          arrivalDate: new Date(res.arrivalDate).toISOString().split('T')[0], // Ensure valid date format (YYYY-MM-DD)
          departureDate: new Date(res.departureDate).toISOString().split('T')[0] // Ensure valid date format (YYYY-MM-DD)
        }));
    
      console.log(`Room ${roomId}: reservation details `, Reservations);
      return Reservations;
    }
    
    isValidArrivalForAvailability(arrivalDate: Date, avail: IRoomAvailability): boolean {
      console.log("step 4: isvalidArrivalforAvailability called");
      
      const arrivalDay = arrivalDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const stayFrom = new Date(avail.stayDateFrom);
      const stayTo = new Date(avail.stayDateTo);
    
      // console.log(" value for isValidArrivalForAvailability", avail, arrivalDate >= stayFrom && arrivalDate <= stayTo && avail.arrivalDays.includes(arrivalDay));
      
      return arrivalDate >= stayFrom && arrivalDate <= stayTo && avail.arrivalDays.includes(arrivalDay);
    }
    
    getDayOfWeek(date: Date): string {
      const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      return daysOfWeek[date.getDay()];
    }
  
}