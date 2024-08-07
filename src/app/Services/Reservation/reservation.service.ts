import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IReservation } from '../../Interface/ireservation';
import axios from 'axios';
import { IRoomAvailability } from '../../Interface/iroom-availability';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl=`https://jadhavsudhit.github.io/Booking-module/stays.json`;

  constructor(private http : HttpClient) { }
  
    async getReservations(): Promise<IRoomAvailability[]>{
      try {
        // Make an HTTP GET request with axios
        const response = await axios.get<IRoomAvailability[]>(this.apiUrl);
        return response.data;
      } catch (error) {
        console.error('Error fetching room availability', error);
        // Handle error as needed, for example, throw an error or return a default value
        throw error;
      }
    }
  }