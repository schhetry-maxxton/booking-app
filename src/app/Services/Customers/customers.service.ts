import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import  axios  from 'axios';
import { ICustomer } from '../../Interface/icustomer';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private localStorageKey='customers'; // setting the key value 

  constructor() { }

  saveCustomer(customer: ICustomer): void {
    const existingCustomers = this.getCustomers();
    existingCustomers.push(customer);
    localStorage.setItem(this.localStorageKey, JSON.stringify(existingCustomers));
  }

  getCustomers(): ICustomer[] {
    const customers = localStorage.getItem(this.localStorageKey);
    return customers ? JSON.parse(customers) : [];
  }

  // clearReservations(): void {
  //   localStorage.removeItem(this.localStorageKey);
  // }
}