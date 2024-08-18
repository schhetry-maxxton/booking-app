// import { Component, Input, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ReservationService } from '../Services/Reservation/reservation.service';
// import { IReservation } from '../Interface/ireservation';
// import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
// import { IRoom } from '../Interface/iroom';
// import { CustomersService } from '../Services/Customers/customers.service';

// @Component({
//   selector: 'app-new-reservation',
//   templateUrl: './new-reservation.component.html',
//   styleUrl: './new-reservation.component.css',
// })
// export class NewReservationComponent implements OnInit{
//   @Input() selectedRoom: IRoom | null = null;
//   bookingForm: FormGroup;
//   currentStep: number = 1;
//   customerForm: FormGroup;
//   paymentForm: FormGroup;

//   constructor(
//     private fb: FormBuilder,
//     private randomNumberService: RandomNumberService,
//     private customerService: CustomersService
//   ) {
//     this.bookingForm = this.fb.group({
//       reservationId: [''],
//       roomNo: [''],
//       stayDateFrom: [''],
//       stayDateTo: [''],
//       numberOfDays: [''],
//       reservationDate:[''],
//       totalNumberOfGuests: [1, [Validators.required, Validators.min(1)]], 
//       pricePerDayPerPerson: [''],
//       totalPrice: [0]
//     });

//     this.customerForm = this.fb.group({
//       customerId: [''],
//       name: ['', [Validators.required]],
//       age: ['', [Validators.required, Validators.min(1)]],
//       birthDate: ['', [Validators.required]],
//       address: [''],
//       mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
//       pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
//       district: [''],
//       city: [''],
//       state: [''],
//       country: ['']
//     });

//     this.paymentForm = this.fb.group({
//       paymentId: this.randomNumberService.generateRandomNumber(),
//       paymentMode: [''],
//       paidAmount: ['', [Validators.required, Validators.min(0)]]
//     });

//     this.bookingForm.get('totalNumberOfGuests')?.valueChanges.subscribe(() => {
//       this.updateTotalPrice();
//     });
//   }

//   ngOnInit(): void {
//     if (this.selectedRoom) {
//       this.openBookingModal(this.selectedRoom);
//     }
//    }

//    private getISTDateTime(): string {
//     const now = new Date();
//     const istDate = new Date(now.getTime());
  
//     const year = istDate.getFullYear();
//     const month = String(istDate.getMonth() + 1).padStart(2, '0');
//     const day = String(istDate.getDate()).padStart(2, '0');
//     const hours = String(istDate.getHours()).padStart(2, '0');
//     const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }

//   openBookingModal(room: IRoom): void {
//     this.selectedRoom = room;

//     // Populate booking form with details
//     const stayDateFrom = room.stayDateFrom;
//     const stayDateTo = room.stayDateTo;
//     const numberOfPerson = room.guestCapacity;
//     const pricePerDays = room.pricePerDayPerPerson;

//     // Calculate number of days
//     const startDate = new Date(stayDateFrom);
//     const endDate = new Date(stayDateTo);
//     const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

//     const formattedDateTime= this.getISTDateTime();

//     this.bookingForm.patchValue({
//       reservationId : this.randomNumberService.generateRandomNumber(),
//       roomNo: room.roomId,
//       stayDateFrom,
//       stayDateTo,
//       numberOfDays,
//       reservationDate:formattedDateTime,
//       totalNumberOfGuests:numberOfPerson,
//       pricePerDayPerPerson: pricePerDays,
//     });

//     this.bookingForm.get('totalNumberOfGuests')?.setValidators([
//       Validators.required,
//       Validators.min(1),
//       Validators.max(room.guestCapacity)
//     ]);

//     this.bookingForm.get('totalNumberOfGuests')?.updateValueAndValidity();

//     this.currentStep = 1; 

//     const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal')!);
//     bookingModal.show();
//   }

//   closeBookingModal(): void {
//     const bookingModal = bootstrap.Modal.getInstance(document.getElementById('bookingModal')!);
//     bookingModal.hide();
//   }

//   nextStep(): void {
//     // console.log("I am clicked");
//     if (this.currentStep === 1 && this.bookingForm.valid) {
//       this.updateCustomerForm();
//       this.currentStep = 2;
//     } else if (this.currentStep === 2 && this.customerForm.valid) {
//       this.currentStep = 3;
//     } else if (this.currentStep === 3 && this.paymentForm.valid) {
//       this.submitBooking();
//     }else {
//       alert("Please fill in all required fields.");
//     }
//   }

//   previousStep(): void {
//     if (this.currentStep > 1) {
//       this.currentStep--;
//     }
//   }

//   private updateCustomerForm(): void {
//     // Example of patching values; update these fields as needed
//     this.customerForm.patchValue({
//       customerId: this.randomNumberService.generateRandomNumber(), // Or any logic to set the customer ID
//       name: '',
//       age: '',
//       birthDate: '',
//       address: '',
//       mobileNumber: '',
//       pincode: '',
//       district: '',
//       city: '',
//       state: '',
//       country: ''
//     });
//   }

//   private updateTotalPrice(): void {
//     const numberOfDays = this.bookingForm.get('numberOfDays')?.value;
//     const numberOfGuests = this.bookingForm.get('totalNumberOfGuests')?.value;
//     const pricePerDayPerPerson = this.bookingForm.get('pricePerDayPerPerson')?.value;

//     if (numberOfDays && numberOfGuests && pricePerDayPerPerson) {
//       const totalPrice = numberOfDays * numberOfGuests * pricePerDayPerPerson;
//       this.bookingForm.get('totalPrice')?.setValue(totalPrice);
//     }
//   }

//   private submitBooking(): void {
//     if(this.paymentForm.valid){
//       const bookingData = {
//         booking: this.bookingForm.value,
//         customer: this.customerForm.value,
//         payment: this.paymentForm.value
//       };
      
//       localStorage.setItem('bookingData', JSON.stringify(bookingData));
//       this.resetForms();
//       // alert("Booking confirmed and stored successfully.");
//     }
//     else{
//       alert("Please fill in all required fields.");
//     }
//   }

//   // Close the modal and reset forms
//     private resetForms(): void {
//     this.closeBookingModal();
//     this.bookingForm.reset();
//     this.customerForm.reset();
//     this.paymentForm.reset();
//     this.selectedRoom = null;
//     this.currentStep = 1; 
//     // Optionally notify the user
//     alert('Booking confirmed and stored successfully.');
//   }

// }

