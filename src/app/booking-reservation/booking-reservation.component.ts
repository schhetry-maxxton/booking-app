import { Component } from '@angular/core';
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

  constructor(private reservationService:ReservationService, private fb: FormBuilder,private modalService: NgbModal,
    private calendarService: CalendarService
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
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
    this.reservations = this.reservationService.getReservations();
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
  

    onStatusChange(reservation: IReservation): void {
      try {
        this.reservationService.updateReservationStatus(reservation);
        console.log('Reservation status updated successfully', reservation.status);
      } catch (error) {
        console.error('Error updating reservation status', error);
      }
    }
    
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
      
      if (!stayDateFrom || !stayDateTo || !filters.numberOfPersons) {
        this.filteredRooms = [];
        return;
      }
    
      // Filtering logic remains unchanged
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
    
      this.filteredRooms = this.rooms.flatMap(room => {
        if (unavailableRoomIds.includes(room.roomId)) {
          return [];
        }
    
        const matchedAvailabilities = room.availabilities.filter(avail => {
          const isValidArrivalDay = filters.dateFrom
            ? avail.arrivalDays.includes(
                new Date(filters.dateFrom).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              )
            : true;
    
          const isValidDepartureDay = filters.dateTo
            ? avail.departureDays.includes(
                new Date(filters.dateTo).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              )
            : true;
    
          const availabilityDuration = (stayDateTo!.getTime() - stayDateFrom!.getTime()) / (1000 * 3600 * 24);
          const isValidStay = this.isWithinStayDuration(availabilityDuration, avail.minStay, avail.maxStay);
          const isCapacity = this.isCapacityMatch(room, filters);
    
          return isValidStay && isCapacity && isValidArrivalDay && isValidDepartureDay;
        });
    
        if (matchedAvailabilities.length === 0) {
          return [];
        }
    
        return { ...room };
      });
    
      this.filteredRoomsCount = this.filteredRooms.length;
      this.isFilterApplied = true;
      
      // Properly close the filter modal after applying filters
      this.closeFilterModal();
    }
    
    
    
    private isAvailable(avail: IRoomAvailability, filters: any): boolean {
      const stayDateFrom = new Date(filters.dateFrom);
      const stayDateTo = new Date(filters.dateTo);
      const availFrom = new Date(avail.stayDateFrom);
      const availTo = new Date(avail.stayDateTo);
    
      return ((!filters.dateFrom && !filters.dateTo) || (stayDateFrom >= availFrom && stayDateTo <= availTo));
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
    
    // openBookingModal(roomDetails: any): void {
    //   console.log('Booking Details:', roomDetails);
      
    //   if(roomDetails){
    //     const bookingDetails = {
    //       roomId: roomDetails.roomId,
    //       locationId: roomDetails.locationId, // Assuming you have a location ID
    //       roomName: roomDetails.roomName, // Assuming you have a room name
    //       pricePerDayPerPerson: roomDetails.pricePerDayPerPerson,
    //       arrivalDate: roomDetails.availabilities.stayDateFrom,
    //       departureDate: roomDetails.availabilities.stayDateTo,
    //       locationName: roomDetails.locationName // Add any other details you have
    //     };
    //   }
    //   const modalRef = this.modalService.open(ModalComponent);
    //   modalRef.componentInstance.bookingDetails = roomDetails;
  
    //   modalRef.result.then((result) => {
    //       console.log('Modal closed with result:', result);
    //       this.ngOnInit();
    //   }, (reason) => {
    //       console.log('Modal dismissed with reason:', reason);
    //   });
    // }

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
    
  
}