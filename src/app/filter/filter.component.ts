import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
import { IReservation } from '../Interface/ireservation';
import { ICustomer } from '../Interface/icustomer';
import { CustomersService } from '../Services/Customers/customers.service';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit {
  
  rooms: IRoom[] = [];
  filteredRooms: Array<IRoom & IRoomAvailability> = [];
  availability: IRoomAvailability[] = [];
  locations: string[] = [];
  filterForm: FormGroup;
  selectedRoom: IRoom | null = null;
  bookingForm: FormGroup;
  customerForm: FormGroup;
  paymentForm: FormGroup;
  currentStep: number = 1;  // to track the current step in the form
  reservations: IReservation[] = [];
  filteredRoomsCount: number | null = null;

  constructor(
    private reservationService: ReservationService,
    private fb: FormBuilder,
    private randomNumberService: RandomNumberService,
    private customerService: CustomersService
  ) {
    this.filterForm = this.fb.group({
      location: [''],
      dateFrom: [''],
      dateTo: [''],
      numberOfPersons: [1, [Validators.min(1)]],
      maxPrice: [4000],
      minStay: [0, [Validators.min(0)]],
      maxStay: [0, [Validators.min(0)]]
    });

    this.bookingForm = this.fb.group({
      reservationId: [''],
      roomNo: [''],
      stayDateFrom: [''],
      stayDateTo: [''],
      numberOfDays: [''],
      reservationDate:[''],
      totalNumberOfGuests: [1, [Validators.required, Validators.min(1)]], 
      pricePerDayPerPerson: [''],
      totalPrice: [0]
    });

    this.customerForm = this.fb.group({
      customerId: [''],
      firstName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,}$/)]],
      middleName: ['',[Validators.pattern(/^[A-Za-z]+$/)]],
      lastName: ['',[Validators.pattern(/^[A-Za-z]+$/)]],
      age:  [{value: '', disabled: true}, [Validators.required, Validators.min(1)]],
      birthDate: ['', [Validators.required]],
      address: ['',[Validators.required,Validators.pattern(/^[a-zA-Z0-9\s\,\''\-]*$/)]],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}$/)]],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      district: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      country: ['', [Validators.required]]
    });

    this.paymentForm = this.fb.group({
      paymentId: this.randomNumberService.generateRandomNumber(),
      paymentMode: ['creditCard'],
      totalAmount: [''],
      paidAmount: ['', [Validators.required]],
      dueAmount: ['']
      
    });

    this.bookingForm.get('totalNumberOfGuests')?.valueChanges.subscribe(() => {
      this.updateTotalPrice();
    });

    this.filterForm.get('location')?.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.filterForm.get('maxPrice')?.valueChanges.subscribe(() => {
      this.applyFilters();
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
    this.reservations = this.reservationService.getReservations(); 
  }

  initializeLocations(): void {
    const locationN=this.rooms.map(room => room.locationName);
    const uniqueLocations = Array.from(new Set(locationN));
    this.locations = uniqueLocations;
  }

  onLocationChange(event: Event): void {
    const selectedLocation = (event.target as HTMLSelectElement).value;
    this.filterForm.patchValue({ location: selectedLocation });
    this.applyFilters();
  }

  getImageUrl(index: number): string {
    const imageIndex = index + 1;  
    return `Assets/images/Room${imageIndex}.jpg`;
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
  
    if (this.filterForm.invalid) {
      alert("Invalid input");
      this.filterForm.patchValue({
        numberOfPersons: [1],
        minStay: [0],
        maxStay: [0]
      });
      return;
    }

    const unavailableRoomIds = this.reservations
    .filter(res => this.isDateRangeOverlapping(
      new Date(filters.dateFrom),
      new Date(filters.dateTo),
      new Date(res.arrivalDate),
      new Date(res.departureDate)
    ))
    .map(res => res.roomId);
  
    const filteredAvailability = this.availability.filter(avail => {
      const room = this.rooms.find(room => room.roomId === avail.roomId);
  
      // if (!room) return false;
      if (!room || unavailableRoomIds.includes(room.roomId)) return false;
  
      return (
        (!filters.location || room.locationName === filters.location) &&
        this.isAvailable(avail, filters) &&
        this.isWithinStayDuration(avail, filters) &&
        this.isCapacityMatch(room, filters) &&
        this.isWithinPriceRange(room, filters)
      );
    });
  
    this.filteredRooms = filteredAvailability.map(avail => {
      const room = this.rooms.find(room => room.roomId === avail.roomId);
      return { ...room, ...avail } as IRoom & IRoomAvailability;
    });
  
    this.filteredRoomsCount = this.filteredRooms.length;
  }
  
  private isAvailable(avail: IRoomAvailability, filters: any): boolean {
    const stayDateFrom = new Date(filters.dateFrom);
    const stayDateTo = new Date(filters.dateTo);
    const availFrom = new Date(avail.stayDateFrom);
    const availTo = new Date(avail.stayDateTo);
  
    return (!filters.dateFrom || !filters.dateTo || (stayDateFrom >= availFrom && stayDateTo <= availTo));
  }
  
  private isCapacityMatch(room: IRoom, filters: any): boolean {
    const numberOfPersons = filters.numberOfPersons || 1;
    return room.guestCapacity >= numberOfPersons;
  }
  
  private isWithinPriceRange(room: IRoom, filters: any): boolean {
    const maxPrice = filters.maxPrice || 4000;
    return room.pricePerDayPerPerson <= maxPrice;
  }
  
  private isWithinStayDuration(avail: IRoomAvailability, filters: any): boolean {
    const minStay = filters.minStay || 0;
    const maxStay = filters.maxStay || 0;
  
    return (minStay <= 0 || avail.minStay >= minStay) &&
           (maxStay <= 0 || avail.maxStay <= maxStay);
  }

  private isDateRangeOverlapping(
    stayDateFrom: Date,
    stayDateTo: Date,
    availFrom: Date,
    availTo: Date
  ): boolean {
    return (stayDateFrom <= availTo && stayDateTo >= availFrom);
  }

  private getISTDateTime(): string {
    const now = new Date();
    const istDate = new Date(now.getTime());
    // Format as 'YYYY-MM-DDTHH:MM'
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onBirthDateChange(): void {
    const birthDate = this.customerForm.get('birthDate')?.value;
    if (birthDate) {
      this.customerForm.get('age')?.setValue(this.calculateAge(new Date(birthDate)));
    }
  }

  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  openBookingModal(room: IRoom): void {
    this.selectedRoom = room;

    const stayDateFrom = this.filterForm.get('dateFrom')?.value;
    const stayDateTo = this.filterForm.get('dateTo')?.value;
    const numberOfPerson = this.filterForm.get('numberOfPersons')?.value;
    const pricePerDays = room.pricePerDayPerPerson;

    // Calculate number of days
    const startDate = new Date(stayDateFrom);
    const endDate = new Date(stayDateTo);
    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    const formattedDateTime= this.getISTDateTime();

    this.bookingForm.patchValue({
      reservationId : this.randomNumberService.generateRandomNumber(),
      roomNo: room.roomId,
      stayDateFrom,
      stayDateTo,
      numberOfDays,
      reservationDate:formattedDateTime,
      totalNumberOfGuests:numberOfPerson,
      pricePerDayPerPerson: pricePerDays,
    });

    this.bookingForm.get('totalNumberOfGuests')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(room.guestCapacity)
    ]);

    this.bookingForm.get('totalNumberOfGuests')?.updateValueAndValidity();

    this.currentStep = 1; 

    const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal')!);
    bookingModal.show();
  }

  closeBookingModal(): void {
    const bookingModal = bootstrap.Modal.getInstance(document.getElementById('bookingModal')!);
    bookingModal.hide();
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.bookingForm.valid) {
      this.updateCustomerForm();
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.customerForm.valid) {
      this.currentStep = 3;
    } else if (this.currentStep === 3 && this.paymentForm.valid) {
      this.submitBooking();
      this.currentStep = 4; 
    } else if (this.currentStep === 4) {
      this.resetForms();
    } else {
      alert("Please fill in all required fields.");
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private updateCustomerForm(): void {
    this.customerForm.patchValue({
      customerId: this.randomNumberService.generateRandomNumber(), 
      firstName: '',
      middleName: '',
      lastName: '',
      age: '',
      birthDate: '',
      address: '',
      mobileNumber: '',
      pincode: '',
      district: '',
      city: '',
      state: '',
      country: ''
    });
  }

  private updateTotalPrice(): void {
    const numberOfDays = this.bookingForm.get('numberOfDays')?.value;
    const numberOfGuests = this.bookingForm.get('totalNumberOfGuests')?.value;
    const pricePerDayPerPerson = this.bookingForm.get('pricePerDayPerPerson')?.value;

    if (numberOfDays && numberOfGuests && pricePerDayPerPerson) {
      const totalPrice = numberOfDays * numberOfGuests * pricePerDayPerPerson;
      this.bookingForm.get('totalPrice')?.setValue(totalPrice);
      this.paymentForm.get('totalAmount')?.setValue(totalPrice);
      this.paymentForm.get('dueAmount')?.setValue(totalPrice);
    }
  }

  updateDueAmount(): void {
    const totalAmount = this.paymentForm.get('totalAmount')?.value;
    const paidAmount = this.paymentForm.get('paidAmount')?.value;
    const dueAmount = totalAmount - paidAmount;
    this.paymentForm.get('dueAmount')?.setValue(dueAmount);
  }

  submitBooking(): void {
    if (this.paymentForm.valid) {
      const bookingData = {
        booking: this.bookingForm.value,
        customer: this.customerForm.value,
        payment: this.paymentForm.value
      };

      const newReservation: IReservation = {
        reservationId: bookingData.booking.reservationId,
        locationId: this.selectedRoom?.locationId || 0,
        roomId: this.selectedRoom?.roomId || 0,
        roomName: this.selectedRoom?.roomName,
        customerId: bookingData.customer.customerId,
        arrivalDate: new Date(bookingData.booking.stayDateFrom),
        departureDate: new Date(bookingData.booking.stayDateTo),
        reservationDate: new Date(bookingData.booking.reservationDate),
        totalPrice: bookingData.booking.totalPrice,
        status: 'CONFIRM',
        paidAmount: bookingData.payment.paidAmount,
        numberOfGuest: bookingData.booking.totalNumberOfGuests
      };

      const newCustomer: ICustomer = {
        customerId: bookingData.customer.customerId,
        age: bookingData.customer.age,
        birthDate: new Date(bookingData.customer.birthDate).getTime(), // Save as timestamp
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName,
        lastName: bookingData.customer.lastName,
        country: bookingData.customer.country,
        state: bookingData.customer.state,
        city: bookingData.customer.city,
        pinCode: bookingData.customer.pincode
      };

      const reservationData = newReservation;
      const customerData = newCustomer;
   
      // Save to local storage
      this.reservationService.saveReservation(reservationData);
      this.customerService.saveCustomer(customerData);
      this.currentStep = 4;
    } else {
      this.customerForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
    }
  }

  resetForms(): void {
    this.closeBookingModal();
    this.bookingForm.reset();
    this.customerForm.reset();
    this.paymentForm.reset();
    this.selectedRoom = null;
    this.currentStep = 1; 
  }
}