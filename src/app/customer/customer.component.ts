import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';
import { CustomersService } from '../Services/Customers/customers.service';
import { ICustomer } from '../Interface/icustomer';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent{
  customerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private randomNumberService: RandomNumberService,
    private customerService: CustomersService
  ) {
    this.customerForm = this.fb.group({
      customerId: this.randomNumberService.generateRandomNumber(),
      firstName: [''],
      middleName: [''],
      lastName: [''],
      age: [''],
      birthDate: [''],
      country: [''],
      state: [''],
      city: [''],
      pinCode: ['']
    });
  }

  // generateCustomerId(): void {
    
  //   const randomNumber = this.randomNumberService.generateRandomNumber();
  //   // this.customerForm.patchValue({
  //   //   customerId: randomNumber,
  //   // });
  //   this.customerForm.controls['customerId'].setValue(randomNumber);
  //   console.log(randomNumber);
  // }

  // onSubmit(): void {
    
  //   const customer: ICustomer = this.customerForm.value;
  //   const exists = this.customerService.getCustomer(customer.customerId);

  //   if (exists) {
  //     console.log('Customer already exists:', exists);
  //     alert("Customer already exists");
  //   } else {
  //     this.customerService.createCustomer(customer);
  //     console.log('Customer added:', customer);
  //   }
    
  // }
  
}
