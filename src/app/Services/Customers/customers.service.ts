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

  // saveCustomer(customer: ICustomer): void {
  //   const existingCustomers = this.getCustomers();
  //   existingCustomers.push(customer);
  //   localStorage.setItem(this.localStorageKey, JSON.stringify(existingCustomers));
  // }

  saveCustomer(customer: ICustomer): void {
    let customers = this.getCustomers(); // Assuming you have a method to get all customers
    const index = customers.findIndex(c => c.customerId === customer.customerId);
  
    if (index !== -1) {
      // Update existing customer
      customers[index] = customer;
    } else {
      // Add new customer
      customers.push(customer);
    }
  
    this.storeCustomers(customers); // Assuming you have a method to store customers
  }

  storeCustomers(customers: ICustomer[]): void {
    // Save customers to local storage or database
    localStorage.setItem(this.localStorageKey, JSON.stringify(customers));
  }

  getCustomers(): ICustomer[] {
    const customers = localStorage.getItem(this.localStorageKey);
    return customers ? JSON.parse(customers) : [];
  }

  getCustomerById(id: number): ICustomer | undefined {
    const customers = this.getCustomers();
    return customers.find(customer => customer.customerId === id);
  }

   // Get customers by their name (first, middle, or last)
   getCustomersByName(name: string): ICustomer[] {
    const customers = this.getCustomers();
    const lowerName = name.toLowerCase(); // Case-insensitive search
    return customers.filter(customer =>
      customer.firstName.toLowerCase().includes(lowerName) ||
      customer.middleName.toLowerCase().includes(lowerName) ||
      customer.lastName.toLowerCase().includes(lowerName)
    );
  }

}