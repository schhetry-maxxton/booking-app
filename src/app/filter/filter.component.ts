import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';

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
  bookingForm: FormGroup;
  currentStep: number = 1;

  constructor(
    private reservationService: ReservationService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      location: [''],
      dateFrom: ['', Validators.required],
      dateTo: ['', Validators.required],
      numberOfPersons: [1, [Validators.required, Validators.min(1)]],
      maxPrice: [0],
      minStay: [0],
      maxStay: [0]
    });

    this.bookingForm = this.fb.group({
      reservation: this.fb.group({
        reservationId: [null, Validators.required],
        locationId: [null, Validators.required],
        roomId: [null, Validators.required],
        customerId: [null, Validators.required],
        arrivalDate: ['', Validators.required],
        departureDate: ['', Validators.required],
        reservationDate: [new Date().toISOString(), Validators.required],
        totalPrice: [0, Validators.required],
        status: ['CONFIRM', Validators.required],
        paidAmount: [0, Validators.required],
        numberOfGuest: [1, [Validators.required, Validators.min(1)]],
      }),
      customer: this.fb.group({
        customerId: [null, Validators.required],
        age: [null, Validators.required],
        birthDate: [null, Validators.required],
        firstName: ['', Validators.required],
        middleName: [''],
        lastName: ['', Validators.required],
        country: ['', Validators.required],
        state: ['', Validators.required],
        city: ['', Validators.required],
        pinCode: [null, Validators.required],
        initialAddress: ['', Validators.required],
        mobileNumber1: [null, Validators.required],
        mobileNumber2: [null],
      }),
      payment: this.fb.group({
        paymentMode: ['', Validators.required],
        paidAmount: [0, Validators.required],
        dueAmount: [0, Validators.required],
      }),
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
    const locationN = this.rooms.map(room => room.locationName);
    const uniqueLocations = Array.from(new Set(locationN));
    this.locations = uniqueLocations;
  }

  applyFilters(): void {
    const filters = this.filterForm.value;

    const filteredAvailability = this.availability.filter(avail => {
      const room = this.rooms.find(room => room.roomId === avail.roomId);
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
      return room ? { ...room, ...avail } : null;
    }).filter(room => room !== null);
  }

  private isAvailable(avail: IRoomAvailability | undefined, filters: any): boolean {
    if (!avail) return false;
    const stayDateFrom = new Date(filters.dateFrom);
    const stayDateTo = new Date(filters.dateTo);
    const availFrom = new Date(avail.stayDateFrom);
    const availTo = new Date(avail.stayDateTo);

    return (!filters.dateFrom || !filters.dateTo || (stayDateFrom <= availTo && stayDateTo >= availFrom));
  }

  private isCapacityMatch(room: IRoom, filters: any): boolean {
    const numberOfPersons = filters.numberOfPersons;
    if (numberOfPersons <= 0) return true;
    return room.guestCapacity >= numberOfPersons;
  }

  private isWithinPriceRange(room: IRoom, filters: any): boolean {
    const maxPrice = filters.maxPrice;
    return maxPrice === 0 || room.pricePerDayPerPerson <= maxPrice;
  }

  private isWithinStayDuration(avail: IRoomAvailability | undefined, filters: any): boolean {
    if (!avail) return false;
    const minStay = filters.minStay;
    const maxStay = filters.maxStay;
    return (minStay <= 0 || minStay <= avail.minStay) &&
           (maxStay === 0 || maxStay >= avail.maxStay);
  }

  selectRoom(room: IRoom) {
    const reservationGroup = this.bookingForm.get('reservation') as FormGroup;
    reservationGroup.patchValue({
      roomId: room.roomId,
      locationId: room.locationId,
      totalPrice: room.pricePerDayPerPerson * reservationGroup.get('numberOfGuest')?.value
    });
  }

  goToNextStep() {
    this.currentStep++;
  }

  goToPreviousStep() {
    this.currentStep--;
  }

  calculateTotalPrice(): void {
    const numberOfDays = this.bookingForm.get('numberOfDays')?.value;
    const totalNumberOfGuest = this.bookingForm.get('totalNumberOfGuest')?.value;
    const pricePerDayPerPerson = this.bookingForm.get('pricePerDayPerPerson')?.value;
    const totalPrice = numberOfDays * totalNumberOfGuest * pricePerDayPerPerson;
    this.bookingForm.get('totalPrice')?.setValue(totalPrice);
  }
  submitBooking() {
    const bookingData = this.bookingForm.value;
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
    alert('Booking submitted!');
  }
}
