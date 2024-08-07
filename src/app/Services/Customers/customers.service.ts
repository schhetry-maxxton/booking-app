import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import  axios  from 'axios';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  constructor(private http:HttpClient) { }

  ngOnInit(){
   return axios.get(`https://jadhavsudhit.github.io/Booking-module/stays.json`) ;
  }
}
