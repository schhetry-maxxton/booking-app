import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit {
  rooms: IRoom[] = [];
  filteredRooms: IRoom[] = [];
  availability: IRoomAvailability[] = [];
  locations: string[] = [];
  filterForm: FormGroup;
  selectedRoom: IRoom | null = null;
  bookingForm: FormGroup;

  constructor(
    private reservationService: ReservationService,
    private fb: FormBuilder,
    private randomNumberService: RandomNumberService
  ) {
    this.filterForm = this.fb.group({
      location: [''],
      dateFrom: [''],
      dateTo: [''],
      numberOfPersons: [0],
      maxPrice: [0],
      minStay: [0],
      maxStay: [0]
    });

    this.bookingForm = this.fb.group({
      reservationId: [''],
      roomNo: [''],
      stayDateFrom: [''],
      stayDateTo: [''],
      numberOfDays: [''],
      totalNumberOfGuests: [''],
      pricePerDayPerPerson: [''],
      totalPrice: [0]
    });


  }

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(
      data => {
        this.rooms = data.rooms;
        this.availability = data.stays;
        this.initializeLocations();
        this.applyFilters();
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  }

  initializeLocations(): void {
    const locationN=this.rooms.map(room => room.locationName);
    // console.log(locationN);
    const uniqueLocations = Array.from(new Set(locationN));
    this.locations = uniqueLocations;
  }

  // Filter method to apply to the rooms based on filter values
  
  applyFilters(): void {
    const filters = this.filterForm.value;

    const filteredAvailability = this.availability.filter(avail => {
      const room = this.rooms.find(room => room.roomId === avail.roomId);   // this will fetch all the available rooms 
      // console.log(room);
      // console.log(!filters.location);
      
      return (
        (!filters.location || (room && room.locationName === filters.location)) &&
        this.isAvailable(avail, filters) &&
        this.isWithinStayDuration(avail, filters) &&
        (room && this.isCapacityMatch(room, filters)) &&
        (room && this.isWithinPriceRange(room, filters))
      );
    });

    this.filteredRooms = filteredAvailability.map(avail => {
      const room = this.rooms.find(room => room.roomId === avail.roomId);
      return room ? { ...room, ...avail } : null; // Combine room and availability details
    }).filter(room => room !== null); 

  }

  private isAvailable(avail: IRoomAvailability | undefined, filters: any): boolean {
  
    if (!avail)
    {
      return false;
    }

    const stayDateFrom = new Date(filters.dateFrom);
    const stayDateTo = new Date(filters.dateTo);
    const availFrom = new Date(avail.stayDateFrom);
    const availTo = new Date(avail.stayDateTo);

    return (!filters.dateFrom || !filters.dateTo || (stayDateFrom <= availTo && stayDateTo >= availFrom));
  }

  private isCapacityMatch(room: IRoom, filters: any): boolean {
    const numberOfPersons = filters.numberOfPersons;
    if (numberOfPersons <= 0) {
      return true;
    }
    return room.guestCapacity >= numberOfPersons;
  }

  private isWithinPriceRange(room: IRoom, filters: any): boolean {
    const maxPrice = filters.maxPrice;
    return maxPrice === 0 || room.pricePerDayPerPerson <= maxPrice;
  }

  private isWithinStayDuration(avail: IRoomAvailability | undefined, filters: any): boolean {
    if (!avail) 
      {
        return false;
      }

    const minStay = filters.minStay;
    const maxStay = filters.maxStay;

    return (minStay <= 0 || minStay<=avail.minStay) &&
           (maxStay === 0 || maxStay>=avail.maxStay);
  }

  openBookingModal(room: IRoom): void {
    this.selectedRoom = room;

    // Populate booking form with details
    const stayDateFrom = this.filterForm.get('dateFrom')?.value;
    const stayDateTo = this.filterForm.get('dateTo')?.value;
    const numberOfPerson = this.filterForm.get('numberOfPersons')?.value;
    const pricePerDays = room.pricePerDayPerPerson;

    // Calculate number of days
    const startDate = new Date(stayDateFrom);
    const endDate = new Date(stayDateTo);
    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    // Calculate total price
    const totalPrice = numberOfDays * numberOfPerson * pricePerDays;

    this.bookingForm.patchValue({
      reservationId : this.randomNumberService.generateRandomNumber(),
      roomNo: room.roomId,
      stayDateFrom,
      stayDateTo,
      numberOfDays,
      totalNumberOfGuests:numberOfPerson,
      pricePerDayPerPerson: pricePerDays,
      totalPrice: totalPrice
    });

    const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal')!);
    bookingModal.show();
  }

  closeBookingModal(): void {
    // Hide the modal
    const bookingModal = bootstrap.Modal.getInstance(document.getElementById('bookingModal')!);
    bookingModal.hide();
  }

  confirmBooking(): void {
    if (this.bookingForm.valid) {
      // Implement booking confirmation logic, e.g., save to database, show confirmation message
      console.log('Booking Confirmed:', this.bookingForm.value);

      // Hide the modal
      this.closeBookingModal();

      // Clear form or reset state as needed
      this.bookingForm.reset();
      this.selectedRoom = null;
    } else {
      console.log('Form is invalid');
    }
  }
}
