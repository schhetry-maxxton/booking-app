import { Component } from '@angular/core';
import { Router } from '@angular/router'; 
import moment from 'moment';
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
  // availability:IRoomAvailability;
  filteredRooms: IRoomWithAvailability[] = [];  
  filterForm: FormGroup;
  selectedRoom: IRoomWithAvailability | null = null;  
  currentStep: number = 1; 
  filteredRoomsCount: number | null = null;
  isFilterApplied: boolean = false;

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
        this.onFilter();
  
        // Log room and availability data
        console.log('Loaded Rooms:', this.rooms);
        
        this.generateCalendarDays();  // Ensure calendar is generated after data is loaded
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  
    this.reservations = this.reservationService.getReservations();
  }
  
  
  onFilter(): void {
    this.applyFilters();
    this.filterOutBookedRooms();
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
    const selectedDate = new Date(year, month - 1, day);
    selectedDate.setHours(12, 0, 0, 0); // Set to noon to maintain consistency for comparisons
  
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    console.log('Selected Date:', selectedDateString);
  
    // If no arrival date is selected, check for valid arrival date
    if (!this.selectedArrivalDate && this.arrivalDateFilter(selectedDate)) {
      this.selectedArrivalDate = selectedDate;
      this.arrivalDateDisplay = this.formatDate(this.selectedArrivalDate);
      this.departureDateDisplay = '';  // Clear the departure date
      this.nightsDisplay = '0 nights';  // Reset nights display
      this.selectedDepartureDate = null;  // Clear any previously selected departure date
  
      // Now generate valid departure dates based on the selected arrival date
      this.validDepartureDates.clear(); // Reset valid departure dates
      this.rooms.forEach(room => {
        room.availabilities.forEach(availability => {
          const validDepartureDates = this.generateDepartureDates(availability, selectedDate);
          validDepartureDates.forEach(date => this.validDepartureDates.add(date));
        });
      });
  
      // Log the valid departure dates for debugging
      console.log('Valid Departure Dates:', Array.from(this.validDepartureDates));
      return; // Exit after setting the arrival date
    }
  
    // If an arrival date is already selected, check for valid departure date
    if (this.selectedArrivalDate && selectedDate > this.selectedArrivalDate) {
      if (this.departureDateFilter(selectedDate)) {
        this.selectedDepartureDate = selectedDate;
        this.departureDateDisplay = this.formatDate(this.selectedDepartureDate);
        this.nightsDisplay = this.getNightsDisplay(); // Calculate and display the number of nights
      }
      return; // Exit after setting the departure date
    }
  
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

// getCellClass(dayObj: { day: number, fromPreviousMonth: boolean }, month: number, year: number): string {
//   if (dayObj.fromPreviousMonth || dayObj.day === 0) {
//     return 'empty-cell';  // Make it non-selectable
//   }

//   // If the date is disabled
//   if (this.isDateLocked(dayObj.day, month, year)) {
//     return 'disabled';
//   }

//   const currentDate = new Date(year, month - 1, dayObj.day);
//   currentDate.setHours(12, 0, 0, 0); // Set to noon for comparison

//   // If this is the selected arrival day
//   if (this.selectedArrivalDate && currentDate.getTime() === this.selectedArrivalDate.getTime()) {
//     return 'selected-arrival';
//   }

//   // Set to 11 AM for the departure comparison
//   currentDate.setHours(11, 0, 0, 0); 

//   // If this is the selected departure day
//   if (this.selectedDepartureDate && currentDate.getTime() === this.selectedDepartureDate.getTime()) {
//     return 'selected-departure';
//   }

//   // If the date is within the selected range
//   if (this.selectedArrivalDate && this.selectedDepartureDate &&
//       currentDate > this.selectedArrivalDate &&
//       currentDate < this.selectedDepartureDate) {
//     return 'selected-range';
//   }

//   return '';  // Default case
// }

getCellClass(dayObj: { day: number, fromPreviousMonth: boolean }, month: number, year: number): string {
  if (dayObj.fromPreviousMonth || dayObj.day === 0) {
    return 'empty-cell';  // Skip non-selectable empty cells
  }

  const currentDate = new Date(year, month - 1, dayObj.day);  // Create date object for the current cell
  // currentDate.setHours(12, 0, 0, 0);  // Set to noon to keep consistency

  const dateString = currentDate.toISOString().split('T')[0];  // Format date as 'YYYY-MM-DD'

  // Scenario 1: When no arrival date is selected, only show valid arrival dates
  if (!this.selectedArrivalDate) {
    if (this.arrivalDateFilter(currentDate)) {
      return 'available-arrival';  // Show selectable arrival dates
    }
    return 'disabled';  // Disable all other dates
  }

  // Scenario 2: After arrival date is selected but no departure date is selected
  if (this.selectedArrivalDate && !this.selectedDepartureDate) {
    if (this.departureDateFilter(currentDate)) {
      return 'available-departure';  // Show valid departure dates
    }
    if (currentDate.getTime() === this.selectedArrivalDate.getTime()) {
      return 'selected-arrival';  // Highlight selected arrival date
    }
    return 'disabled';  // Disable all other dates except valid departure and selected arrival
  }

  // Scenario 3: When both arrival and departure dates are selected
  if (this.selectedArrivalDate && this.selectedDepartureDate) {
    // Highlight selected arrival date
    if (currentDate.getTime() === this.selectedArrivalDate.getTime()) {
      return 'selected-arrival';
    }

    // Highlight selected departure date
    if (currentDate.getTime() === this.selectedDepartureDate.getTime()) {
      return 'selected-departure';
    }

    // Highlight range between arrival and departure dates
    if (currentDate > this.selectedArrivalDate && currentDate < this.selectedDepartureDate) {
      return 'selected-range';
    }

    return 'disabled';  // Disable all other dates outside the selected range
  }

  return '';  // Default case, return empty class if nothing applies
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
  selectedDate.setHours(12, 0, 0, 0);  // Set time to noon

  // If no arrival date is selected, lock all dates except valid arrival dates
  if (!this.selectedArrivalDate) {
    const dateString = selectedDate.toISOString().split('T')[0];
    return !this.validArrivalDates.has(dateString);  // Disable all non-arrival dates
  }

  // If an arrival date is selected but no departure date is selected, lock all dates except valid departure dates
  if (this.selectedArrivalDate && !this.selectedDepartureDate) {
    const dateString = selectedDate.toISOString().split('T')[0];
    return !this.validDepartureDates.has(dateString);  // Disable all non-departure dates
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

    private makeRoomsData(rooms: IRoomWithAvailability[], availabilities: IRoomAvailability[]): IRoomWithAvailability[] {
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
      const today=new Date();
      // If dateFrom, dateTo, or number of persons is missing, clear the filtered rooms and return
      if (!stayDateFrom || !stayDateTo || !filters.numberOfPersons) {
        this.filteredRooms = [];
        return;
      }
    
      // Find unavailable rooms based on existing reservations (overlapping date ranges)
      const unavailableRoomIds = this.reservations
        .filter(res => {
          if (stayDateFrom && stayDateTo) {
            return this.isDateRangeOverlapping(
              stayDateFrom,
              stayDateTo,
              new Date(res.arrivalDate),
              new Date(res.departureDate)
            );
          }
          return false;
        })
        .map(res => res.roomId);
    
      // Filter rooms based on availability and user-selected criteria
      this.filteredRooms = this.rooms.flatMap(room => {
        // Exclude unavailable rooms
        if (unavailableRoomIds.includes(room.roomId)) {
          return [];
        }
    
        // Filter availabilities based on booking range, stay duration, capacity, arrival/departure days
        const matchedAvailabilities = room.availabilities.filter(avail => {
          const bookFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
          const bookTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;
    
          // Ensure booking dates are valid
          if (!bookFrom || !bookTo) {
            return false; // Skip if booking period is invalid
          }
    
          // Check if stayDateFrom and stayDateTo fall within the booking range
          const isWithinBookingPeriod = (today >= bookFrom && today <= bookTo);
          if (!isWithinBookingPeriod) {
            return false; // Skip if the selected dates are not within the booking period
          }
    
          // Check if the selected arrival day is valid
          const isValidArrivalDay = filters.dateFrom
            ? avail.arrivalDays.includes(
                stayDateFrom.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              )
            : true;
    
          // Check if the selected departure day is valid
          const isValidDepartureDay = filters.dateTo
            ? avail.departureDays.includes(
                stayDateTo.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              )
            : true;
    
          // Calculate stay duration in days
          const availabilityDuration = (stayDateTo!.getTime() - stayDateFrom!.getTime()) / (1000 * 3600 * 24);
    
          // Check if the stay duration is valid
          const isValidStay = this.isWithinStayDuration(availabilityDuration, avail.minStay, avail.maxStay);
    
          // Check if room capacity matches the selected number of persons
          const isCapacity = this.isCapacityMatch(room, filters);
    
          // Final condition for matching availability
          return isWithinBookingPeriod && isValidStay && isCapacity && isValidArrivalDay && isValidDepartureDay;
        });
    
        // If no availabilities match, exclude the room
        if (matchedAvailabilities.length === 0) {
          return [];
        }
  
        return { ...room };
      });
    
      this.filteredRoomsCount = this.filteredRooms.length;
      this.isFilterApplied = true;
      this.closeFilterModal();
    }
    
    private isCapacityMatch(room: IRoomWithAvailability, filters: any): boolean {
      const numberOfPersons = filters.numberOfPersons || 1;
      return room.guestCapacity >= numberOfPersons;
    }

    private isWithinStayDuration(duration: number, minStay: number, maxStay: number): boolean {
      console.log(" no. of days ", duration);
      console.log(" minStay ", minStay);
      console.log(" maxStay ", maxStay);

      return (duration >= minStay && duration <= maxStay);
    }

    private isDateRangeOverlapping(
      stayDateFrom: Date,
      stayDateTo: Date,
      availFrom: Date,
      availTo: Date
    ): boolean {
      return (stayDateFrom <= availTo && stayDateTo >= availFrom);
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
    
    generateArrivalDates(room: IRoomAvailability): Set<string> {
      const arrivalDates = new Set<string>();
      const today = new Date();
      
      // Log current date (today)
      // console.log('Today\'s Date:', today);
    
      const bookFrom = new Date(room.bookDateFrom || room.stayDateFrom);
      const bookTo = new Date(room.bookDateTo || room.stayDateTo);
      
      // console.log('Room:', room);
      // console.log('Book From:', bookFrom, 'Book To:', bookTo);
    
      const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (room.minDeviation || 0));
      const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (room.maxDeviation || 10));
    
      // console.log('Min Date Before Comparison:', minDate);
      // console.log('Max Date Before Comparison:', maxDate);
    
      const effectiveMinDate = minDate < bookFrom ? bookFrom : minDate;
      const effectiveMaxDate = maxDate > bookTo ? bookTo : maxDate;
    
      // console.log('Effective Min Date:', effectiveMinDate, 'Effective Max Date:', effectiveMaxDate);
    
      const getDayOfWeek = (date: Date): string => {
        const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return daysOfWeek[date.getDay()];
      };
    
      for (let date = new Date(effectiveMinDate); date <= effectiveMaxDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = getDayOfWeek(date);
        if (room.arrivalDays && room.arrivalDays.includes(dayOfWeek)) {
          const formattedDate = date.toISOString().split('T')[0];
          arrivalDates.add(formattedDate);
        } else {
          // console.log(`Day ${dayOfWeek} is not valid for arrival.`);
        }
      }
    
      // console.log('Valid Arrival Dates:', Array.from(arrivalDates));
    
      return arrivalDates;
    }
    
    
    
  
    // Step 3: Reservation check for overlapping dates
    isDateReserved(roomId: number, date: Date): boolean {
      return this.reservations.some(reservation => {
        return (
          reservation.roomId === roomId &&
          new Date(reservation.arrivalDate) <= date &&
          new Date(reservation.departureDate) >= date
        );
      });
    }
  
    generateDepartureDates(room: IRoomAvailability, arrivalDate: Date): Set<string> {
      const departureDates = new Set<string>();
      
      const stayFrom = new Date(room.stayDateFrom);
      const stayTo = new Date(room.stayDateTo);
      const minStay = room.minStay || 1;
      const maxStay = room.maxStay || 30;
    
      const minDepartureDate = new Date(arrivalDate);
      minDepartureDate.setDate(minDepartureDate.getDate() + minStay);
    
      const maxDepartureDate = new Date(arrivalDate);
      maxDepartureDate.setDate(maxDepartureDate.getDate() + maxStay);
    
      const effectiveMinDeparture = minDepartureDate > stayFrom ? minDepartureDate : stayFrom;
      const effectiveMaxDeparture = maxDepartureDate < stayTo ? maxDepartureDate : stayTo;
    
      // console.log('Effective Min Departure:', effectiveMinDeparture, 'Effective Max Departure:', effectiveMaxDeparture);
    
      const getDayOfWeek = (date: Date): string => {
        const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return daysOfWeek[date.getDay()];
      };
    
      for (let date = new Date(effectiveMinDeparture); date <= effectiveMaxDeparture; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = getDayOfWeek(date);
        if (room.departureDays.includes(dayOfWeek)) {
          const formattedDate = date.toISOString().split('T')[0];
          departureDates.add(formattedDate);
        }
      }
    
      // console.log('Valid Departure Dates:', Array.from(departureDates));
      return departureDates;
    }
    
    
    filterOutBookedRooms(): void {
      const formValues = this.filterForm.value;
      const arrivalDate = new Date(formValues.dateFrom);
      const departureDate = new Date(formValues.dateTo);
    
      const bookings = this.reservationService.getReservations(); // Retrieve the existing bookings
    
      this.filteredRooms = this.filteredRooms.filter(room => {
        return !bookings.some(booking => 
          booking.roomId === room.roomId && this.isDateOverlap(booking.arrivalDate, booking.departureDate, arrivalDate, departureDate)
        );
      });
    }
    
    isDateOverlap(start1: any, end1: any, start2: any, end2: any): boolean {
      return moment(start2).isBetween(moment(start1), moment(end1), null, '[]') || 
             moment(end2).isBetween(moment(start1), moment(end1), null, '[]') || 
             moment(start1).isBetween(moment(start2), moment(end2), null, '[]') || 
             moment(end1).isBetween(moment(start2), moment(end2), null, '[]');
    }
    
    arrivalDateFilter = (date: Date | null): boolean => {
      if (!date) return false;
      
      const formattedDate = date.toISOString().split('T')[0];
      // console.log('Checking Date:', formattedDate);
    
      const arrivalDatesSet = new Set<string>();
    
      this.rooms.forEach(room => {
        room.availabilities.forEach(availability => {
          const validArrivalDates = this.generateArrivalDates(availability);
          validArrivalDates.forEach(date => arrivalDatesSet.add(date));
        });
      });
    
      // console.log('Valid Arrival Dates Set:', Array.from(arrivalDatesSet));
      // console.log('Is Selected Date Valid:', arrivalDatesSet.has(formattedDate));
    
      return arrivalDatesSet.has(formattedDate);
    };
    
    
    departureDateFilter = (date: Date | null): boolean => {
      if (!date) return false;
    
      const arrivalDate = this.selectedArrivalDate;
      if (!arrivalDate || date <= arrivalDate) return false;
    
      const formattedDate = date.toISOString().split('T')[0];
      return this.validDepartureDates.has(formattedDate);
    };
    
    
}