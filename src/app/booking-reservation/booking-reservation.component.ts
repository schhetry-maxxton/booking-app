import { Component } from '@angular/core';
import { IReservation } from '../Interface/ireservation';
import { ReservationService } from '../Services/Reservation2/reservation2.service'; 
import { IRoomWithAvailability } from '../Interface/rooms-with-availability';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';

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

  constructor(private reservationService:ReservationService, private fb: FormBuilder,private modalService: NgbModal){

    this.filterForm = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
      numberOfPersons: [1, [Validators.min(1)]],
    });

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

    // applyFilters(): void {
    //   const filters = this.filterForm.value;
  
    //   // Get the values of check-in and check-out dates
    //   const stayDateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    //   const stayDateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  
    //   // Check if check-in and check-out dates are provided
    //   const datesProvided = !!stayDateFrom && !!stayDateTo;
  
    //   // No rooms are shown if no filters are provided
    //   if (!datesProvided && !filters.numberOfPersons) {
    //     this.filteredRooms = [];
    //     return;
    //   }
  
    //   // Get the rooms unavailable due to existing reservations
    //   const unavailableRoomIds = this.reservations
    //     .filter(res => {
    //       if (stayDateFrom && stayDateTo) {
    //         return this.isDateRangeOverlapping(
    //           stayDateFrom,
    //           stayDateTo,
    //           new Date(res.arrivalDate),
    //           new Date(res.departureDate)
    //         );
    //       }
    //       return false;
    //     })
    //     .map(res => res.roomId);
  
    //   // Filter the rooms based on availability, dates, and capacity
    //   this.filteredRooms = this.rooms.flatMap(room => {
    //     if (unavailableRoomIds.includes(room.roomId)) {
    //       return [];  // Skip unavailable rooms
    //     }
  
    //     const matchedAvailabilities = room.availabilities.filter(avail => {
    //       if (datesProvided) {
    //         const isValidArrivalDay = filters.dateFrom
    //           ? avail.arrivalDays.includes(
    //               new Date(filters.dateFrom).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    //             )
    //           : true;
  
    //         const isValidDepartureDay = filters.dateTo
    //           ? avail.departureDays.includes(
    //               new Date(filters.dateTo).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    //             )
    //           : true;
  
    //         const availabilityDuration = (stayDateTo!.getTime() - stayDateFrom!.getTime()) / (1000 * 3600 * 24);  // Duration in days
  
    //         const isValidStay = this.isWithinStayDuration(availabilityDuration, avail.minStay, avail.maxStay);
    //         const isCapacity = this.isCapacityMatch(room, filters);
  
    //         return isValidStay && isCapacity && isValidArrivalDay && isValidDepartureDay;
    //       }
  
    //       return false;  // If no dates are provided, return no matches
    //     });
  
    //     if (matchedAvailabilities.length === 0) {
    //       return [];
    //     }
  
    //     return { ...room };
    //   });
  
    //   this.filteredRoomsCount = this.filteredRooms.length;
    //   this.isFilterApplied = true;
  
    //   console.log('Filtered Rooms:', this.filteredRooms);  // Debugging filtered rooms
  
    //   // Close the modal once filters are applied
    //   this.closeModal();
    // }

    applyFilters(): void {
      const filters = this.filterForm.value;
  
      const stayDateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const stayDateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  
      if (!stayDateFrom || !stayDateTo || !filters.numberOfPersons) {
        this.filteredRooms = [];
        return;
      }
  
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
  
        const modalRef = this.modalService.open(ModalComponent);
        modalRef.componentInstance.bookingDetails = {
          roomId: room.roomId,
          arrivalDate: dateFrom,
          departureDate: dateTo,
          pricePerDayPerPerson: room.pricePerDayPerPerson,
          roomName: room.roomName,
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

    // closeModal(): void {
    //   const reservationModal = document.getElementById('reservationModal');
      
    //   if (reservationModal) {
    //     const modalInstance = bootstrap.Modal.getInstance(reservationModal);
        
    //     if (modalInstance) {
    //       modalInstance.hide();
    //     }
    //   }
    
    //   // Remove the modal backdrop manually after the modal is closed
    //   const modalBackdrop = document.querySelector('.modal-backdrop');
      
    //   if (modalBackdrop) {
    //     modalBackdrop.remove();  // Manually remove the modal backdrop
    //   }
    // }

    openFilterModal(): void {
      // Reset the filter form when opening the modal
      this.filterForm.reset({
        dateFrom: '',
        dateTo: '',
        numberOfPersons: 1  // Reset to default value
      });
  
      // Show the filter modal (for selecting date and number of persons)
      const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal')!);
      reservationModal.show();
    }
  
    /**
     * Closes the booking modal (for "Book Now") without resetting anything.
     */
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
          modalInstance.hide();
        }
      }

        const modalBackdrop = document.querySelector('.modal-backdrop');
      
      if (modalBackdrop) {
        modalBackdrop.remove();  // Manually remove the modal backdrop
      }
    }
}