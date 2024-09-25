import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IRoomWithAvailability } from '../Interface/rooms-with-availability'; // Updated import
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation2/reservation2.service';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
import { IReservation } from '../Interface/ireservation';
import { ICustomer } from '../Interface/icustomer';
import { CustomersService } from '../Services/Customers/customers.service';
import { jsPDF } from 'jspdf'; 


@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterComponent implements OnInit {
  
  rooms: IRoomWithAvailability[] = [];  // Updated type
  filteredRooms: IRoomWithAvailability[] = [];  // Only rooms, not availabilities

  // Updated type
  // availability: IRoomAvailability[] = [];
  locations: string[] = [];
  filterForm: FormGroup;
  selectedRoom: IRoomWithAvailability | null = null;  // Updated type
  bookingForm: FormGroup;
  customerForm: FormGroup;
  paymentForm: FormGroup;
  currentStep: number = 1;  // to track the current step in the form
  reservations: IReservation[] = [];
  filteredRoomsCount: number | null = null;
  isFilterApplied: boolean = false;
  showCustomerIdInput: boolean = false; // To control visibility of customer ID input
  showCustomerForm: boolean = false; // To control visibility of the customer form
  isExistingCustomer: boolean = false;
  showButtons: boolean = true;
  errorMessage: string | null = null;

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
      maxPrice: [4000, Validators.required], 
      minStay: ['', [Validators.min(1)]],
      maxStay: ['',[Validators.max(10)]]
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
      paymentMode: ['Cash'],
      totalAmount: [''],
      paidAmount: ['', [Validators.required]],
      dueAmount: ['']
    });

    this.bookingForm.get('totalNumberOfGuests')?.valueChanges.subscribe(() => {
      this.updateTotalPrice();
    });

    this.bookingForm.get('stayDateFrom')?.valueChanges.subscribe(() => {
      this.updateDateValidation();
    });
    
    this.bookingForm.get('stayDateTo')?.valueChanges.subscribe(() => {
      this.updateDateValidation();
    });

    this.filterForm.get('maxPrice')?.valueChanges.subscribe(value => {
      // console.log("Max Price changed to: ", value);  // Check if the value is updating
      this.applyFilters();  // Trigger filters after maxPrice change
    });
    

    this.paymentForm.get('totalAmount')?.valueChanges.subscribe(() => {
      this.updateDueAmount();
    });
  }

  // Function to combine room data with their availabilities
  private makeRoomsData(rooms: IRoomWithAvailability[], availabilities: IRoomAvailability[]): IRoomWithAvailability[] {
    console.log('Rooms Data:', rooms);  // Log the rooms data
    // console.log('Availabilities Data:', availabilities);  // Log the availability data

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

  private updateDateValidation(): void {
    const stayDateFrom = this.bookingForm.get('stayDateFrom')?.value;
    const stayDateTo = this.bookingForm.get('stayDateTo')?.value;
  
    if (stayDateFrom && stayDateTo) {
      const startDate = new Date(stayDateFrom);
      const endDate = new Date(stayDateTo);
  
      if (endDate <= startDate) {
        endDate.setDate(startDate.getDate() + 1);  // Ensure check-out is at least one day after check-in
        this.bookingForm.get('stayDateTo')?.setValue(endDate.toISOString().split('T')[0], { emitEvent: false });
      }
      
      this.updateNumberOfDays();
    }
  }

  ngOnInit(): void {
    console.log(" Hello ngOnInit 1");
    this.reservationService.getRoomsAndStays().subscribe(
      data => {
        this.rooms = this.makeRoomsData(data.rooms, data.stays); // Call the new function
        this.initializeLocations();
        this.applyFilters();
      },
      error => {
        console.error('Error fetching data', error);
      }
    );

    console.log(" Hello ngOnInit  2");
    
    this.reservations = this.reservationService.getReservations(); 
  }


  initializeLocations(): void {
    const locationN = this.rooms.map(room => room.locationName);
    const uniqueLocations = Array.from(new Set(locationN));
    this.locations = uniqueLocations;
  }

  getImageUrl(index: number): string {
    const imageIndex = index + 1;  
    return `Assets/images/Room${imageIndex}.jpg`;
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

  isBookingAllowed(): boolean {
    const checkInDate = this.filterForm.get('dateFrom')?.value;
    const checkOutDate = this.filterForm.get('dateTo')?.value;
    return checkInDate && checkOutDate; // Returns true only if both dates are filled
  }

  newCustomer(): void {
    this.customerForm.reset();
    const newCustomerId = this.randomNumberService.generateRandomNumber();
    this.customerForm.patchValue({
      customerId: newCustomerId
    });
    this.showCustomerIdInput = false; // Hide customer ID input field
    this.showCustomerForm = true; // Show the entire customer form
    this.isExistingCustomer = false;
    this.showButtons = false; 
    this.currentStep = 2;
  }

  existingCustomer(): void {
    this.showCustomerIdInput = true; // Show customer ID input field
    this.showCustomerForm = false; // Hide the customer form
    this.isExistingCustomer = true;
    this.showButtons = false;
  }

  searchCustomer(customerIdInput: HTMLInputElement): void {
    const customerId = Number(customerIdInput.value);
    const existingCustomer = this.customerService.getCustomerById(customerId);
    if (existingCustomer) {
      console.log(existingCustomer);
      this.customerForm.patchValue(existingCustomer);
      this.showCustomerIdInput = false; // Hide customer ID input field
      this.showCustomerForm = true; // Show the customer form
      this.errorMessage = null;
    } else {
      this.errorMessage = 'Customer not found.'; 
    }
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
  
    // Get the values of check-in and check-out dates
    const stayDateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const stayDateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  
    // Check if check-in and check-out dates are provided
    const datesProvided = !!stayDateFrom && !!stayDateTo;
  
    // Get the rooms unavailable due to existing reservations
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
      // Skip rooms that are unavailable due to reservations
      if (unavailableRoomIds.includes(room.roomId)) {
        return [];
      }
  
      const matchedAvailabilities = room.availabilities.filter(avail => {
        // Allow filtering by price only, regardless of date availability
        const isWithinPrice = this.isWithinPriceRange(room, filters);
  
        // Check if dates are provided, then apply full filtering logic
        if (datesProvided) {
          const isValidArrivalDay = filters.dateFrom
            ? avail.arrivalDays.includes(
                new Date(filters.dateFrom)
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .toUpperCase()
              )
            : true;
  
          const isValidDepartureDay = filters.dateTo
            ? avail.departureDays.includes(
                new Date(filters.dateTo)
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .toUpperCase()
              )
            : true;
  
          const availabilityDuration =
            (stayDateTo!.getTime() - stayDateFrom!.getTime()) / (1000 * 3600 * 24); // Duration in days
  
          const isValidStay = this.isWithinStayDuration(
            availabilityDuration,
            avail.minStay,
            avail.maxStay
          );
          const isCapacity = this.isCapacityMatch(room, filters);
  
          return (
            (!filters.location || room.locationName === filters.location) &&
            this.isAvailable(avail, filters) &&
            isWithinPrice &&
            isValidStay &&
            isCapacity &&
            isValidArrivalDay &&
            isValidDepartureDay
          );
        }
  
        // If dates are not provided, only apply the price filter
        return isWithinPrice;
      });
  
      // If no availabilities matched, skip the room
      if (matchedAvailabilities.length === 0) {
        return [];
      }
  
      // Return the room (not availability) if any availabilities matched the criteria
      return { ...room };
    });
  
    this.filteredRoomsCount = this.filteredRooms.length;
    console.log('Filtered Rooms:', this.filteredRooms); // Debugging filtered rooms
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

  private isWithinPriceRange(room: IRoomWithAvailability, filters: any): boolean {
    const maxPrice = filters.maxPrice || 4000;
    // console.log("Applying price filter, maxPrice: ", maxPrice, " Room price: ", room.pricePerDayPerPerson);  // Debugging
    return room.pricePerDayPerPerson <= maxPrice;
  }
  

  // private isWithinStayDuration(avail: IRoomAvailability, filters: any): boolean {
  //   const minStay = filters.minStay || 0;
  //   const maxStay = filters.maxStay || 0;
  
  //   return (minStay <= 0 || avail.minStay >= minStay) &&
  //          (maxStay <= 0 || avail.maxStay <= maxStay);
  // }

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

  private getISTDateTime(): string {
    const now = new Date();
    const istDate = new Date(now.getTime());
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  openBookingModal(room: IRoomWithAvailability): void {
    this.selectedRoom = room;
    const stayDateFrom = new Date(this.filterForm.get('dateFrom')?.value);
    const stayDateTo = new Date(this.filterForm.get('dateTo')?.value);
    const numberOfPerson = this.filterForm.get('numberOfPersons')?.value;
    const pricePerDays = room.pricePerDayPerPerson;

    stayDateFrom.setHours(12, 0, 0, 0);
    stayDateTo.setHours(11, 0, 0, 0);
  
    if (stayDateTo.getHours() > 11) {
      stayDateTo.setDate(stayDateTo.getDate() + 1);
    }
  
    const numberOfDays = Math.ceil((stayDateTo.getTime() - stayDateFrom.getTime()) / (1000 * 3600 * 24));
    const formattedDateTime = this.getISTDateTime();
  
    this.bookingForm.patchValue({
      reservationId: this.randomNumberService.generateRandomNumber(),
      roomNo: room.roomId,
      stayDateFrom: stayDateFrom.toISOString().split('T')[0],
      stayDateTo: stayDateTo.toISOString().split('T')[0],
      numberOfDays: numberOfDays, 
      reservationDate: formattedDateTime,
      totalNumberOfGuests: numberOfPerson,
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
      this.showCustomerIdInput = false;
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.customerForm.valid) {
      this.currentStep = 3;
      this.showCustomerIdInput = true;
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
      this.showCustomerForm = false; 
      this.showCustomerIdInput = false;
      this.showButtons = true;
      this.errorMessage = null;
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
  
    const totalAmountNumber = Number(totalAmount);
    const paidAmountNumber = Number(paidAmount);
  
    const dueAmount = totalAmountNumber - paidAmountNumber;
  
    this.paymentForm.get('dueAmount')?.setValue(dueAmount);
  }
  
  updateNumberOfDays(): void {
    const stayDateFrom = this.bookingForm.get('stayDateFrom')?.value;
    const stayDateTo = this.bookingForm.get('stayDateTo')?.value;
  
    if (stayDateFrom && stayDateTo) {
      const numberOfDays = this.calculateNumberOfDays();
      this.bookingForm.get('numberOfDays')?.setValue(numberOfDays, { emitEvent: false });
      this.updateTotalPrice();
    }
  }

  calculateNumberOfDays(): number {
    const stayDateFrom = new Date(this.bookingForm.get('stayDateFrom')?.value);
    let stayDateTo = new Date(this.bookingForm.get('stayDateTo')?.value);

    if (stayDateFrom && stayDateTo) {
      if (stayDateTo <= stayDateFrom) {
        stayDateTo = new Date(stayDateFrom);
        stayDateTo.setDate(stayDateTo.getDate() + 1);
        this.bookingForm.get('stayDateTo')?.setValue(stayDateTo.toISOString().split('T')[0], { emitEvent: false });
      }
    }

    stayDateFrom.setHours(12, 0, 0, 0);
    stayDateTo.setHours(11, 0, 0, 0);

    const numberOfDays = Math.ceil((stayDateTo.getTime() - stayDateFrom.getTime()) / (1000 * 3600 * 24));

    return numberOfDays <= 0 ? 1 : numberOfDays;
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
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName,
        lastName: bookingData.customer.lastName,
        locationId: this.selectedRoom?.locationId || 0,
        roomId: this.selectedRoom?.roomId || 0,
        roomName: this.selectedRoom?.roomName,
        customerId: bookingData.customer.customerId,
        arrivalDate: new Date(bookingData.booking.stayDateFrom),
        departureDate: new Date(bookingData.booking.stayDateTo),
        reservationDate: new Date(bookingData.booking.reservationDate),
        totalPrice: bookingData.booking.totalPrice,
        dueAmount: bookingData.payment.dueAmount,
        status: 'CONFIRM',
        paidAmount: bookingData.payment.paidAmount,
        numberOfGuest: bookingData.booking.totalNumberOfGuests
      };

      const newCustomer: ICustomer = {
        customerId: bookingData.customer.customerId,
        age: bookingData.customer.age,
        birthDate: bookingData.customer.birthDate,
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName,
        lastName: bookingData.customer.lastName,
        country: bookingData.customer.country,
        state: bookingData.customer.state,
        city: bookingData.customer.city,
        pincode: bookingData.customer.pincode,
        mobileNumber: bookingData.customer.mobileNumber,
        district: bookingData.customer.district,
        address: bookingData.customer.address,
      };

      const reservationData = newReservation;
      const customerData = newCustomer;

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
    this.showCustomerIdInput = false;
    this.showCustomerForm = false;
    this.showButtons = true;
  }

  onPaymentModeChange(event: Event): void {
    const paymentMode = (event.target as HTMLSelectElement).value;
    this.updateFormControls(paymentMode);
  }

  updateFormControls(paymentMode: string): void {
    this.paymentForm.get('cardNumber')?.reset();
    this.paymentForm.get('cardHolderName')?.reset();
    this.paymentForm.get('expiryDate')?.reset();
    this.paymentForm.get('cvv')?.reset();
    this.paymentForm.get('bankName')?.reset();
    this.paymentForm.get('accountNumber')?.reset();
  }

  isCardPayment(): boolean {
    const paymentMode = this.paymentForm.get('paymentMode')?.value;
    return paymentMode === 'creditCard' || paymentMode === 'debitCard';
  }

  isNetBanking(): boolean {
    const paymentMode = this.paymentForm.get('paymentMode')?.value;
    return paymentMode === 'netBanking';
  }

  isUPI(): boolean {
    const paymentMode = this.paymentForm.get('paymentMode')?.value;
    return paymentMode === 'upi';
  }

  downloadInvoicePDF(): void {
    const doc = new jsPDF();

    console.log('Booking Form:', this.bookingForm.value);
    console.log('Customer Form:', this.customerForm.value);
    console.log('Payment Form:', this.paymentForm.value);
    
    const imgWidth = 50; 
    const imgHeight = 20;
    doc.addImage('Assets/plugin.png', 'PNG', 10, 10, imgWidth, imgHeight);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.text('www.luxstays.com', 90, 20);  

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Invoice', 170, 20);  

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('Booking Information', 10, 50);  // Section title
    doc.setFontSize(10);
    doc.text(`Reservation ID: ${this.bookingForm.get('reservationId')?.value}`, 10, 60);
    doc.text(`Room No: ${this.bookingForm.get('roomNo')?.value}`, 10, 70);
    doc.text(`Stay From: ${this.bookingForm.get('stayDateFrom')?.value}`, 10, 80);
    doc.text(`Stay To: ${this.bookingForm.get('stayDateTo')?.value}`, 10, 90);
    doc.text(`Number of Days: ${this.bookingForm.get('numberOfDays')?.value}`, 10, 100);
    doc.text(`Total Guests: ${this.bookingForm.get('totalNumberOfGuests')?.value}`, 10, 110);
  
    doc.setFontSize(14);
    doc.text('Customer Information', 10, 130);
    doc.setFontSize(10);
    doc.text(`Customer ID: ${this.customerForm.get('customerId')?.value}`, 10, 140);
    doc.text(`Name: ${this.customerForm.get('firstName')?.value} ${this.customerForm.get('middleName')?.value} ${this.customerForm.get('lastName')?.value}`, 10, 150);
    doc.text(`Address: ${this.customerForm.get('address')?.value}`, 10, 160);
    doc.text(`Mobile: ${this.customerForm.get('mobileNumber')?.value}`, 10, 170);
  
    doc.setFontSize(14);
    doc.text('Payment Information', 10, 190);
    doc.setFontSize(10);
    doc.text(`Total Amount: ${this.paymentForm.get('totalAmount')?.value}`, 10, 200);
    doc.text(`Paid Amount: ${this.paymentForm.get('paidAmount')?.value}`, 10, 210);
    doc.text(`Due Amount: ${this.paymentForm.get('dueAmount')?.value}`, 10, 220);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for booking with us!', 10, 260);
    doc.text('For inquiries, contact us at support@luxstays.com | Phone: +91-8093282515', 10, 270);

    doc.save(`Invoice_${this.bookingForm.get('reservationId')?.value}.pdf`);
  }

}