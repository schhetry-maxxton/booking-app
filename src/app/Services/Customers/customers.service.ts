import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import  axios  from 'axios';
import { ICustomer } from '../../Interface/icustomer';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private localStorageKey='customers'; // setting the key value 

    createCustomer(newCustomer: ICustomer): boolean{
    let customers = this.getCustomers();
    const existingCustomer = customers.find(customer =>{
      customer.customerId === newCustomer.customerId;
    });
    
    if(existingCustomer){
      return false;
    }
    
    customers.push(newCustomer);
    this.saveCustomer(customers);
    return true;
  }

  constructor() { }

  getCustomers() : ICustomer[]{
    const customersData = localStorage.getItem(this.localStorageKey); 

    if(customersData != null){
      return JSON.parse(customersData);
    }
    return [];
  }

  getCustomer(customerId: number): ICustomer | undefined {
    const customers = this.getCustomers();
    return customers.find(customer => customer.customerId === customerId);
  }

  saveCustomer(customers : ICustomer[]) : void{
    localStorage.setItem(this.localStorageKey, JSON.stringify(customers));
  }
}
