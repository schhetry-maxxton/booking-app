import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
import { CustomersService } from '../Services/Customers/customers.service';
import { IReservation } from '../Interface/ireservation';
import { ICustomer } from '../Interface/icustomer';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { jsPDF } from 'jspdf'; 
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() bookingDetails: any;
  @Input() filteredRooms: any[] = []; // Accept filtered rooms from parent
  @Input() filterForm: any; // Accept filter form data from parent
  // @Input() reservationDetails: any;
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
  DOB: string;
  filteredCustomers: ICustomer[] = [];
  hoveredCustomer: ICustomer | null = null;
  noResultsMessage: string | null = null;

  constructor(public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private randomNumberService: RandomNumberService,
    private reservationService: ReservationService,
    private customerService: CustomersService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { 

    const today=new Date();
    this.DOB=today.toISOString().split('T')[0];


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
    if (this.filterForm) {
      this.bookingForm.patchValue({
        dateFrom: this.filterForm.dateFrom,
        dateTo: this.filterForm.dateTo,
        numberOfPersons: this.filterForm.numberOfPersons,
      });
    }
  }


  selectRoom(room: any): void {
    this.selectRoom = room;
    // Proceed with room selection and prefill booking details
    this.bookingForm.patchValue({
      // Adjust as per your booking form structure
      dateFrom: this.filterForm.dateFrom,
      dateTo: this.filterForm.dateTo,
      numberOfPersons: this.filterForm.numberOfPersons,
    });
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
  
      console.log("modal  bookingDetails : ", this.bookingDetails);
      
      this.bookingForm.patchValue({
        reservationId: this.randomNumberService.generateRandomNumber(),
        roomNo: this.bookingDetails.roomId,
        stayDateFrom: stayDateFrom.toISOString().split('T')[0], // Format date for input
        stayDateTo: stayDateTo.toISOString().split('T')[0],     // Format date for input
        numberOfDays: this.calculateNumberOfDays(),
        reservationDate: this.getISTDateTime(),
        totalNumberOfGuests: this.bookingDetails.numberOfPersons,
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

    // Search for existing customers by name
    searchCustomerByName(event: Event | null = null): void {
      const name = event ? (event.target as HTMLInputElement).value.trim().toLowerCase() : ''; // Get name from event or use an empty string
  
      if (name.length >= 2) {
        // Get all customers
        const customers = this.customerService.getCustomers();
        
        // Filter customers based on name
        this.filteredCustomers = customers.filter(customer => {
          const fullName = `${customer.firstName} ${customer.middleName ? customer.middleName : ''} ${customer.lastName}`.trim().toLowerCase();
          return customer.firstName.toLowerCase().includes(name) || fullName.includes(name);
        }).slice(0, 5); // Limit to 5 results
  
        if (this.filteredCustomers.length === 0) {
          this.noResultsMessage = 'No customers found.'; // Set message if no results
        } else {
          this.noResultsMessage = null; // Clear the message if results found
        }
  
      } else {
        this.filteredCustomers = [];
        this.noResultsMessage = 'Please enter at least 2 characters.'; // Message if input is too short
      }
    }
    
  
    searchCustomerByNameOnClick(): void {
      const searchInput = (document.getElementById('customerSearchInput') as HTMLInputElement)?.value.trim();
      if (searchInput) {
        this.searchCustomerByName({ target: { value: searchInput } } as unknown as Event);
      }
    }

    selectCustomer(customer: ICustomer): void {
      this.customerForm.patchValue(customer); // Populate the form with selected customer details
      this.showCustomerIdInput = false; // Hide search inputs after selection
      this.showCustomerForm = true;     // Show the customer form
      this.filteredCustomers = [];      // Clear the dropdown list
      this.errorMessage=null;
      this.noResultsMessage = null; 
    }

    onBirthDateChange(): void {
      const birthDate = this.customerForm.get('birthDate')?.value;
      if (birthDate) {
        const age = this.calculateAge(new Date(birthDate));
        this.customerForm.get('age')?.setValue(age);  // Set the calculated age
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
    let stayDateTo = new Date(this.bookingForm.get('stayDateTo')?.value);
  
    // Ensure stayDateTo is always at least one day after stayDateFrom
    if (stayDateFrom && stayDateTo) {
      // If stayDateTo is less than or equal to stayDateFrom, set it to the next day
      if (stayDateTo <= stayDateFrom) {
        stayDateTo = new Date(stayDateFrom);
        stayDateTo.setDate(stayDateTo.getDate() + 1);
        this.bookingForm.get('stayDateTo')?.setValue(stayDateTo.toISOString().split('T')[0], { emitEvent: false });
      }
    }
  
    // Set check-in and check-out hours
    stayDateFrom.setHours(12, 0, 0, 0);
    stayDateTo.setHours(11, 0, 0, 0);
  
    const numberOfDays = Math.ceil((stayDateTo.getTime() - stayDateFrom.getTime()) / (1000 * 3600 * 24));
  
    // Return at least one day for single-day stays
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
    this.errorMessage = null;
    if (this.currentStep === 1 && this.bookingForm.valid) {
      this.updateCustomerForm();
      this.showCustomerIdInput=false;
      this.currentStep = 2;
    }else if (this.currentStep === 2 && !this.isExistingCustomer && this.customerForm.valid) {
      this.currentStep = 3; // Move to next step after new customer form
      this.showCustomerIdInput=true;
    }  else if (this.currentStep === 2 && this.customerForm.valid) {
      this.currentStep = 3; // Move to Search Existing Customer by Name
      // this.errorMessage=null;
    }  else if (this.currentStep === 3 && this.paymentForm.valid) {
      this.submitBooking();
      this.currentStep = 4;
    } else if (this.currentStep === 4) {
      this.resetForms();
    } else {
      this.errorMessage = 'Please fill in all required fields.';
    
      // Mark all form controls as touched to display validation errors
      this.customerForm.markAllAsTouched();
      this.bookingForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
    }
  }


  // nextStep(): void {
   
  //   else if (this.currentStep === 2 && !this.isExistingCustomer && this.customerForm.valid) {
  //     this.currentStep = 3; // Move to next step after new customer form
  //   } 
  //   else if (this.currentStep === 3 && this.paymentForm.valid) {
  //     this.currentStep = 4; // Move to payment step
  //   } 
  //   else if (this.currentStep === 4) {
  //     this.submitBooking(); // Submit the booking
  //   } 
  //   else {
  //     // Show error message if form is not valid
  //     this.errorMessage = 'Please fill in all required fields.';
  
  //     // Mark all form controls as touched to show errors
  //     this.customerForm.markAllAsTouched();
  //     this.bookingForm.markAllAsTouched();
  //     this.paymentForm.markAllAsTouched();
  //   }
  // }
  
  // previousStep(): void {
  //   // Logic to move back to the previous step
  //   if (this.currentStep === 4) {
  //     this.currentStep = 3; // Move back to Customer Form
  //   } 
  //   else if (this.currentStep === 3 && this.isExistingCustomer) {
  //     this.currentStep = 2; // Move back to Customer Selection (New/Existing)
  //   } 
  //   else if (this.currentStep === 2) {
  //     this.currentStep = 1; // Move back to Booking Form
  //   }
  // }

  
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showCustomerForm = false; 
      this.showCustomerIdInput = false;
      this.showButtons = true;
      this.errorMessage=null;
      this.noResultsMessage = null; 
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
    this.customerForm.get('age')?.enable();
    if (this.paymentForm.valid) {
      const bookingData = {
        booking: this.bookingForm.value,
        customer: this.customerForm.value,
        payment: this.paymentForm.value,
      };
      
      const newReservation: IReservation = {
        reservationId: bookingData.booking.reservationId,
        firstName: bookingData.customer.firstName,
        middleName: bookingData.customer.middleName || '',
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
        middleName: bookingData.customer.middleName || '',
        lastName: bookingData.customer.lastName,
        mobileNumber: bookingData.customer.mobileNumber,
        address: bookingData.customer.address,
        country: bookingData.customer.country,
        state: bookingData.customer.state,
        city: bookingData.customer.city,
        pincode: bookingData.customer.pincode,
        district: bookingData.customer.district,
      };

      console.log(" newCustomer ", newCustomer);
      
      this.reservationService.saveReservation(newReservation);
      this.customerService.saveCustomer(newCustomer);
      this.currentStep = 4;
      this.customerForm.get('age')?.disable();
    } else {
      this.customerForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
    }
    
  }

  redirectToChart(){
    // After saving booking, navigate to the Gantt chart
    // setTimeout(() => {
    //   this.router.navigate(['/planningchart']);
    // }, 2000); 
    this.router.navigate(['/planningchart']);
  }

  redirectToReservationDetails(){
    this.ngOnInit();
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

  onCloseButtonClick(): void {
    this.activeModal.close();
     // Add your redirection logic here
     this.router.navigate(['/planningchart']);
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

  // doc.setFont('helvetica', 'bold');
  // doc.setFontSize(16);
  // doc.text('Discover The Comfortable', 70, 20);  

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
    doc.text(`Number of Nights: ${this.bookingForm.get('numberOfDays')?.value}`, 10, 100);
    doc.text(`Total Guests: ${this.bookingForm.get('totalNumberOfGuests')?.value}`, 10, 110);
  
    // Customer Information
    doc.setFontSize(14);
    doc.text('Customer Information', 10, 130);
    doc.setFontSize(10);
    doc.text(`Customer ID: ${this.customerForm.get('customerId')?.value}`, 10, 140);
    doc.text(`Name: ${this.customerForm.get('firstName')?.value} ${this.customerForm.get('middleName')?.value || ''} ${this.customerForm.get('lastName')?.value || ''}`, 10, 150);
    doc.text(`Address: ${this.customerForm.get('address')?.value} ${this.customerForm.get('district')?.value}  ${this.customerForm.get('city')?.value}  ${this.customerForm.get('pincode')?.value}`, 10, 160);
    doc.text(`Mobile: ${this.customerForm.get('mobileNumber')?.value}`, 10, 170);
  
    // Payment Information
    doc.setFontSize(14);
    doc.text('Payment Information', 10, 190);
    doc.setFontSize(10);
    doc.text(`Total Amount: ${this.paymentForm.get('totalAmount')?.value}`, 10, 200);
    doc.text(`Paid Amount: ${this.paymentForm.get('paidAmount')?.value}`, 10, 210);
    doc.text(`Due Amount: ${this.paymentForm.get('dueAmount')?.value}`, 10, 220);

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Thank you for booking with us!', 10, 260);
  doc.text('For inquiries, contact us at support@luxstays.com | Phone: +91-80932-82515', 10, 270);

  // Save the generated PDF
  doc.save(`Invoice_${this.bookingForm.get('reservationId')?.value}.pdf`);
  }

}
