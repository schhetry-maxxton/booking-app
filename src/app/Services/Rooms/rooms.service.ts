import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import axios from 'axios';
import { IRoom } from '../../Interface/iroom';

@Injectable({
  providedIn: 'root'
})
export class RoomsService {
  private apiUrl=`https://jadhavsudhit.github.io/Booking-module/rooms.json`;

  constructor() { }

  async getRooms(): Promise<IRoom[]>{
   try {
      // Make an HTTP GET request with axios
      const response = await axios.get<IRoom[]>(this.apiUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching rooms', error);
      // Handle error as needed, for example, throw an error or return a default value
      throw error;
    }
  }

  
}
