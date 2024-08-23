import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IReservation } from '../../Interface/ireservation';
import axios from 'axios';
import { IRoomAvailability } from '../../Interface/iroom-availability';
import { IRoom } from '../../Interface/iroom';
import { forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ReservationService {
  private storageKey = 'reservations';
  // private reservations: IReservation[] = [];
  
  private roomsUrl = 'https://jadhavsudhit.github.io/Booking-module/rooms.json';
  private staysUrl = 'https://jadhavsudhit.github.io/Booking-module/stays.json';

  constructor(private http: HttpClient) { }

  getRoomsAndStays(): Observable<{ rooms: IRoom[], stays: IRoomAvailability[] }> {
    return forkJoin({
      rooms: this.http.get<IRoom[]>(this.roomsUrl),
      stays: this.http.get<IRoomAvailability[]>(this.staysUrl)
    });
  }

  saveReservation(reservation: IReservation): void {
    const existingReservations = this.getReservations();
    existingReservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(existingReservations));
  }

  // updateReservationStatus(reservation: IReservation): void {
  //   const foundReservation = this.getReservations().find(r => r.reservationId === reservation.reservationId);
  //   if (foundReservation) {
  //     foundReservation.status = reservation.status;
  //     this.saveReservation(foundReservation);
  //   }
  // }

  getReservations(): IReservation[] {
    const reservations = localStorage.getItem(this.storageKey);
    return reservations ? JSON.parse(reservations) : [];
  }

  clearReservations(): void {
    localStorage.removeItem(this.storageKey);
  }

}