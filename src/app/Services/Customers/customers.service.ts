import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import  axios  from 'axios';
import { ICustomer } from '../../Interface/icustomer';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private localStorageKey='customers'; // setting the key value 

    // createCustomer(newCustomer: ICustomer): boolean{
    // let customers = this.getCustomers();
    // const existingCustomer = customers.find(customer =>{
    //   customer.customerId === newCustomer.customerId;
    // });
    
    // if(existingCustomer){
    //   return false;
    // }
    
    // customers.push(newCustomer);
    // this.saveCustomer(customers);
    // return true;
    // }

  constructor() { }

  // getCustomers() : ICustomer[]{
  //   const customersData = localStorage.getItem(this.localStorageKey); 

  //   if(customersData != null){
  //     return JSON.parse(customersData);
  //   }
  //   return [];
  // }

  // saveCustomer(customers : ICustomer[]) : void{
  //   localStorage.setItem(this.localStorageKey, JSON.stringify(customers));
  // }

  // getCustomer(customerId: number): ICustomer | undefined {
  //   const customers = this.getCustomers();
  //   return customers.find(customer => customer.customerId === customerId);
  // }

  saveCustomer(customer: ICustomer): void {
    const existingCustomers = this.getCustomers();
    existingCustomers.push(customer);
    localStorage.setItem(this.localStorageKey, JSON.stringify(existingCustomers));
  }

  // Retrieve all reservations from local storage
  getCustomers(): ICustomer[] {
    const customers = localStorage.getItem(this.localStorageKey);
    return customers ? JSON.parse(customers) : [];
  }

  // Clear all reservations (optional)
  clearReservations(): void {
    localStorage.removeItem(this.localStorageKey);
  }
}


// let customers: ICustomer[] = JSON.parse(localStorage.getItem('customers') || '[]');
// customers.push(newCustomer);
// localStorage.setItem('customers', JSON.stringify(customers));