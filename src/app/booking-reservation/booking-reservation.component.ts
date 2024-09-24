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
  validArrivalDates: Set<string> = new Set();
  validDepartureDates: Set<string> = new Set();
  nightsDisplay: string = '0 nights'; // Track nights count

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
        this.generateValidArrivalDates();  
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
    selectedDate.setHours(12, 0, 0, 0);  // Set the selected date to 12:00 PM for arrival logic consistency
  
    // Convert selectedDate to "YYYY-MM-DD" for comparison with validArrivalDates
    const selectedDateString = selectedDate.toISOString().split('T')[0];
  
    // If no arrival date is selected, check if the selected date is a valid arrival date
    if (!this.selectedArrivalDate && this.validArrivalDates.has(selectedDateString)) {
      this.selectedArrivalDate = selectedDate;
      this.arrivalDateDisplay = this.formatDate(this.selectedArrivalDate);
      this.departureDateDisplay = '';  // Clear the departure date
      this.nightsDisplay = '0 nights';  // Reset nights display
      this.selectedDepartureDate = null;  // Clear any previously selected departure date
      this.generateValidDepartureDates();  // Populate valid departure dates based on the selected arrival date
      return;  // Exit the function since the arrival date has been set
    }
  
    // If an arrival date is already selected and the selected date is after the arrival date
    if (this.selectedArrivalDate && selectedDate > this.selectedArrivalDate) {
      this.selectedDepartureDate = selectedDate;
      this.selectedDepartureDate.setHours(11, 0, 0, 0);
      this.departureDateDisplay = this.formatDate(this.selectedDepartureDate);
      this.nightsDisplay = this.getNightsDisplay();  // Calculate and display the number of nights
      return;  // Exit the function since the departure date has been set
    }
  
    // If no valid selection, don't modify anything
    console.log('Selected date is not valid for arrival or departure.');
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
  // 1. Skip non-selectable cells (like previous/next month filler cells)
  if (dayObj.fromPreviousMonth || dayObj.day === 0) {
    return 'empty-cell';  // Non-selectable empty cells
  }

  const currentDate = new Date(year, month - 1, dayObj.day);  // Create date object for the current cell
  currentDate.setHours(12, 0, 0, 0);  // Set to 12:00 PM for consistent comparison

  // Convert the date to the YYYY-MM-DD format for comparison
  const dateString = currentDate.toISOString().split('T')[0];

  // Scenario 1: Display selectable arrival dates when no arrival date is selected
  if (!this.selectedArrivalDate) {
    if (this.validArrivalDates.has(dateString)) {
      return 'available-arrival';  // Mark as selectable arrival day
    }
    return 'disabled';  // Disable all other dates
  }

  // Scenario 2: Display selectable departure dates after selecting an arrival date
  if (this.selectedArrivalDate && !this.selectedDepartureDate) {
    // Highlight the selected arrival date
    if (currentDate.getTime() === this.selectedArrivalDate.getTime()) {
      return 'selected-arrival';
    }

    // Mark valid departure dates as selectable
    if (this.validDepartureDates.has(dateString)) {
      return 'available-departure';  // Mark as selectable departure day
    }
    return 'disabled';  // Disable all other dates
  }

  // Scenario 3: Both arrival and departure dates are selected
  if (this.selectedArrivalDate && this.selectedDepartureDate) {
    // Highlight selected arrival date
    if (currentDate.getTime() === this.selectedArrivalDate.getTime()) {
      return 'selected-arrival';
    }

    // Highlight selected departure date
    if (currentDate.getTime() === this.selectedDepartureDate.getTime()) {
      return 'selected-departure';
    }

    // Highlight the range between arrival and departure dates
    if (currentDate > this.selectedArrivalDate && currentDate < this.selectedDepartureDate) {
      return 'selected-range';
    }

    // Disable all other dates outside the selected range
    return 'disabled';
  }

  return '';  // Default case if no specific condition applies
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

// isDateLocked(day: number, month: number, year: number): boolean {
//   const selectedDate = new Date(year, month - 1, day);
//   // selectedDate.setHours(12, 0, 0, 0);  // Set time to noon

//   // If no arrival date is selected, lock all dates except valid arrival dates
//   if (!this.selectedArrivalDate) {
//     const dateString = selectedDate.toISOString().split('T')[0];
//     return !this.validArrivalDates.has(dateString);  // Disable all non-arrival dates
//   }

//   // If an arrival date is selected but no departure date is selected, lock all dates except valid departure dates
//   if (this.selectedArrivalDate && !this.selectedDepartureDate) {
//     const dateString = selectedDate.toISOString().split('T')[0];
//     return !this.validDepartureDates.has(dateString);  // Disable all non-departure dates
//   }

//   return false;  // Otherwise, the date is enabled
// }

// Utility to get the name of the month
  getMonthName(month: number): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1];
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
  
      // Step 2: Loop through the availabilities and add them to the corresponding room
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
          const isValidDepartureDay = this.isValidDepartureDay(stayDateFrom, stayDateTo, avail);
    
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
    
    
    
    isValidDepartureDay(arrivalDate: Date, departureDate: Date, availability: IRoomAvailability): boolean {
      const stayDuration = (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24); // Calculate stay duration in days
      
      // Validate that the stay duration is within the minStay and maxStay range
      if (stayDuration < availability.minStay || stayDuration > availability.maxStay) {
        console.log(`Invalid stay duration: ${stayDuration} days (Min: ${availability.minStay}, Max: ${availability.maxStay})`);
        return false;
      }
    
      // Check that the selected departure day matches one of the room's valid departure days
      const departureDay = departureDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      return availability.departureDays.includes(departureDay);
    }
    
    
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
    
    generateValidArrivalDates(): Set<string> {
      
      const currentDate = new Date();
      const currentTime = currentDate.getTime();
    
      // Clear the set of valid arrival dates and the map
      this.validArrivalDates.clear();
      const validArrivalMap: { [key: string]: IRoomAvailability[] } = {};  // Store dates and their corresponding stays
    
      this.rooms.forEach(room => {
        room.availabilities.forEach(avail => {
          const { bookDateFrom, bookDateTo, arrivalDays, minDeviation, maxDeviation } = avail;
    
          const bookFrom = bookDateFrom ? new Date(bookDateFrom) : new Date();
          const bookTo = bookDateTo ? new Date(bookDateTo) : avail.stayDateTo;
    
          if ((bookFrom && currentDate < bookFrom) || (bookTo && currentDate > bookTo)) {
            return;  // Skip if booking dates are out of range
          }
    
          const minDate = new Date(currentDate.getTime() + (minDeviation || 0) * 24 * 60 * 60 * 1000);
          const maxDate = new Date(currentDate.getTime() + (maxDeviation || 0) * 24 * 60 * 60 * 1000);
    
          // const effectiveFromDate = bookFrom ? (minDate > bookFrom ? minDate : bookFrom) : minDate;
          // const effectiveToDate = bookTo ? (maxDate < bookTo ? maxDate : bookTo) : maxDate;
    
          for (let date = minDate; date <= maxDate; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    
            if (date.toDateString() === currentDate.toDateString()) {
              const todayNoon = new Date();
              // todayNoon.setHours(12, 0, 0, 0);
              if (currentTime >= todayNoon.getTime()) {
                continue;  // Skip today's date if it's past 12:00 PM
              }
            }
    
            if (arrivalDays.includes(dayOfWeek) && !this.isDateReserved(room.roomId, date)) {
              const dateString = date.toISOString().split('T')[0];
              this.validArrivalDates.add(dateString);  // Add to valid arrival dates
    
              // Add this stay to the validArrivalMap
              if (!validArrivalMap[dateString]) {
                validArrivalMap[dateString] = [];
              }
              validArrivalMap[dateString].push(avail);  // Store the availability in the map for this date
            }
          }
        });
      });
    
      console.log("Valid Arrival Dates:", Array.from(this.validArrivalDates));
      console.log("Valid Arrival Map:", validArrivalMap);
      return this.validArrivalDates;
    }
    
    
    
    generateCombinedArrivalDates(): Set<string> {
      const combinedDates = new Set<string>();
      this.rooms.forEach(room => {
        const roomDates = this.generateValidArrivalDates();
        roomDates.forEach(date => combinedDates.add(date));
      });
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
    
  
    generateValidDepartureDates(): void {
      if (!this.selectedArrivalDate) {
        console.error("No arrival date selected.");
        return;
      }
    
      const selectedArrivalDate = new Date(this.selectedArrivalDate);
      this.validDepartureDates.clear();  // Clear previous departure dates
      const validDepartureMap: { [key: string]: IRoomAvailability[] } = {};  // Map to track departure dates and their availabilities
    
      this.rooms.forEach(room => {
        room.availabilities.forEach(avail => {
          // Check if this availability allows the selected arrival date
          if (this.isValidArrivalForAvailability(selectedArrivalDate, avail)) {
            const minStay = avail.minStay;
            const maxStay = avail.maxStay;
    
            // Calculate the earliest and latest valid departure dates based on min/max stay
            const minDepartureDate = new Date(selectedArrivalDate);
            minDepartureDate.setDate(minDepartureDate.getDate() + minStay);  // Min stay departure
    
            const maxDepartureDate = new Date(selectedArrivalDate);
            maxDepartureDate.setDate(maxDepartureDate.getDate() + maxStay);  // Max stay departure
    
            const stayFrom = new Date(avail.stayDateFrom);
            const stayTo = new Date(avail.stayDateTo);
    
            // Handle open-ended `bookDateFrom` and `bookDateTo`
            const bookFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
            const bookTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;
    
            // Skip if the selected arrival is before the bookable period
            if (bookFrom && selectedArrivalDate < bookFrom) {
              return;
            }
    
            // Calculate final max departure, ensuring `bookDateTo` is respected
            const finalMaxDeparture = bookTo ? new Date(Math.min(maxDepartureDate.getTime(), bookTo.getTime())) : maxDepartureDate;
    
            // Adjust for `stayDateFrom` and `stayDateTo`
            const effectiveMinDeparture = minDepartureDate < stayFrom ? stayFrom : minDepartureDate;
            const effectiveMaxDeparture = maxDepartureDate > stayTo ? stayTo : finalMaxDeparture;
    
            // Loop through the effective departure range and find valid departure days
            for (let date = new Date(effectiveMinDeparture); date <= effectiveMaxDeparture; date.setDate(date.getDate() + 1)) {
              const dayOfWeek = this.getDayOfWeek(date);  // Get the weekday
    
              // Handle cases where `departureDays` is empty by defaulting to all days
              if (!avail.departureDays || avail.departureDays.length === 0) {
                avail.departureDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Default to all days
              }
    
              // Skip dates that are outside the booking window
              if (bookFrom && date < bookFrom) {
                continue;  // Skip dates before `bookDateFrom`
              }
              if (bookTo && date > bookTo) {
                continue;  // Skip dates after `bookDateTo`
              }
    
              // **NEW: Check if the room is reserved on the current departure date**
              if (!this.isDateReserved(room.roomId, date)) {
                // Check if this day is a valid departure day
                if (avail.departureDays.includes(dayOfWeek)) {
                  const formattedDate = date.toISOString().split('T')[0];
                  this.validDepartureDates.add(formattedDate);
    
                  // Add this availability to the map for the departure date
                  if (!validDepartureMap[formattedDate]) {
                    validDepartureMap[formattedDate] = [];
                  }
                  validDepartureMap[formattedDate].push(avail);  // Store the availability for the departure date
                }
              } else {
                console.log(`Skipping date ${date} as room ${room} is already reserved.`);
              }
            }
          }
        });
      });
    
      console.log("Valid Departure Dates:", Array.from(this.validDepartureDates));
      console.log("Valid Departure Map:", validDepartureMap);
    }
    
    
    isValidArrivalForAvailability(arrivalDate: Date, avail: IRoomAvailability): boolean {
      const arrivalDay = arrivalDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const stayFrom = new Date(avail.stayDateFrom);
      const stayTo = new Date(avail.stayDateTo);
    
      return arrivalDate >= stayFrom && arrivalDate <= stayTo && avail.arrivalDays.includes(arrivalDay);
    }
    
    getDayOfWeek(date: Date): string {
      const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      return daysOfWeek[date.getDay()];
    }
  
}