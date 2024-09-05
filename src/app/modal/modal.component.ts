import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
import { CustomersService } from '../Services/Customers/customers.service';
import { IReservation } from '../Interface/ireservation';
import { IRoom } from '../Interface/iroom';
import { ICustomer } from '../Interface/icustomer';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { router } from '../app.router';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  // @Input() arrivalDate!: Date;
  // @Input() departureDate!: Date;
  // @Input() roomId!: number;
  // @Input() pricePerDayPerPerson!: number;
  @Input() bookingDetails: any;
  bookingForm: FormGroup;
  customerForm: FormGroup;
  paymentForm: FormGroup;
  currentStep: number = 1;
  guests: number[] = [];
  showCustomerIdInput: boolean = false; // To control visibility of customer ID input
  showCustomerForm: boolean = false; // To control visibility of the customer form
  isExistingCustomer: boolean = false;
  showButtons: boolean = true;
  errorMessage: string | null = null;
  

  constructor(public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private randomNumberService: RandomNumberService,
    private reservationService: ReservationService,
    private customerService: CustomersService
  ) { 

    this.bookingForm = this.fb.group({
      reservationId: [''],
      roomNo: [''],
      stayDateFrom: [''],
      stayDateTo: [''],
      numberOfDays: [''],
      reservationDate:[''],
      totalNumberOfGuests: [1, [Validators.required, Validators.min(1), Validators.max(10)]], 
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

    // this.bookingForm.get('totalNumberOfGuests')?.valueChanges.subscribe(() => {
    //   this.updateTotalPrice();
    // });

    // this.paymentForm.get('totalAmount')?.valueChanges.subscribe(() => {
    //   this.updateDueAmount();
    // });

    this.bookingForm.get('stayDateFrom')?.valueChanges.subscribe(() => {
      this.updateNumberOfDays();
    });
  
    this.bookingForm.get('stayDateTo')?.valueChanges.subscribe(() => {
      this.updateNumberOfDays();
    });
  
    this.bookingForm.get('totalNumberOfGuests')?.valueChanges.subscribe(() => {
      this.updateTotalPrice();
    });
  
    this.paymentForm.get('totalAmount')?.valueChanges.subscribe(() => {
      this.updateDueAmount();
    });
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

  ngOnInit(): void {
    this.setupInitialFormValues();
    this.updateNumberOfDays();
    this.updateTotalPrice();  
    
  }

  setupInitialFormValues(): void {
    if (this.bookingDetails) {
      const stayDateFrom = new Date(this.bookingDetails.arrivalDate);
      const stayDateTo = new Date(this.bookingDetails.departureDate);
  
      // Adjust times for check-in and check-out
      stayDateFrom.setHours(12, 0, 0, 0);
      stayDateTo.setHours(11, 0, 0, 0);
  
      // Adjust departure date for edge case
      if (stayDateTo.getHours() > 11) {
        stayDateTo.setDate(stayDateTo.getDate() + 1);
      }
  
      this.bookingForm.patchValue({
        reservationId: this.randomNumberService.generateRandomNumber(),
        roomNo: this.bookingDetails.roomId,
        stayDateFrom: stayDateFrom.toISOString().split('T')[0], // Format date for input
        stayDateTo: stayDateTo.toISOString().split('T')[0],     // Format date for input
        numberOfDays: this.calculateNumberOfDays(),
        reservationDate: this.getISTDateTime(),
        totalNumberOfGuests: 1,
        pricePerDayPerPerson: this.bookingDetails.pricePerDayPerPerson,
      });
    }
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

  calculateNumberOfDays(): number {
    const stayDateFrom = new Date(this.bookingForm.get('stayDateFrom')?.value);
    const stayDateTo = new Date(this.bookingForm.get('stayDateTo')?.value);
    
    // Set times for calculation
    stayDateFrom.setHours(12, 0, 0, 0);
    stayDateTo.setHours(11, 0, 0, 0);
  
    // Adjust endDate to the next day if it is after the check-out time
    if (stayDateTo.getHours() > 11) {
      stayDateTo.setDate(stayDateTo.getDate() + 1);
    }
  
    const numberOfDays = Math.ceil((stayDateTo.getTime() - stayDateFrom.getTime()) / (1000 * 3600 * 24));
    
    // Handle the edge case where the number of days might be zero but it's a single-day stay
    return numberOfDays <= 0 ? 1 : numberOfDays;
  }

  getISTDateTime(): string {
    const now = new Date();
    const istDate = new Date(now.getTime());
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  updateTotalPrice(): void {
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
    const dueAmount = Number(totalAmount) - Number(paidAmount);
    this.paymentForm.get('dueAmount')?.setValue(dueAmount);
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.bookingForm.valid) {
      this.updateCustomerForm();
      this.showCustomerIdInput=false;
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.customerForm.valid ) {
      this.currentStep = 3;
      this.showCustomerIdInput=true;
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
      this.errorMessage=null;
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

  private submitBooking(): void {
    if (this.paymentForm.valid) {
      const bookingData = {
        booking: this.bookingForm.value,
        customer: this.customerForm.value,
        payment: this.paymentForm.value,
      };
      
      const newReservation: IReservation = {
        reservationId: bookingData.booking.reservationId,
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName,
        lastName: bookingData.customer.lastName,
        locationId: bookingData.booking.locationId, // Update this as needed
        roomId: bookingData.booking.roomNo,
        roomName: bookingData.booking.roomName, 
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

      // console.log(newReservation);
      const newCustomer: ICustomer = {
        customerId: bookingData.customer.customerId,
        age: bookingData.customer.age,
        birthDate: bookingData.customer.birthDate,
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName,
        lastName: bookingData.customer.lastName,
        mobileNumber: bookingData.customer.mobileNumber,
        address: bookingData.customer.address,
        country: bookingData.customer.country,
        state: bookingData.customer.state,
        city: bookingData.customer.city,
        pincode: bookingData.customer.pincode,
        district: bookingData.customer.district,
      };

      this.reservationService.saveReservation(newReservation);
      this.customerService.saveCustomer(newCustomer);
      this.currentStep = 4;
    } else {
      this.customerForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
    }
    
  }

  resetForms(): void {
    this.activeModal.close();
    this.bookingForm.reset();
    this.customerForm.reset();
    this.paymentForm.reset();
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
}
