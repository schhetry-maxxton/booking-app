import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IReservation } from '../../Interface/ireservation';
import { IRoomAvailability } from '../../Interface/iroom-availability';
import { IRoomWithAvailability } from '../../Interface/rooms-with-availability';
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

  getRoomsAndStays(): Observable<{ rooms: IRoomWithAvailability[], stays: IRoomAvailability[] }> {
    return forkJoin({
      rooms: this.http.get<IRoomWithAvailability[]>(this.roomsUrl),
      stays: this.http.get<IRoomAvailability[]>(this.staysUrl)
    });
  }

  saveReservation(reservation: IReservation): void {
    const existingReservations = this.getReservations();
    existingReservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(existingReservations));
  }

  updateReservationStatus(reservation: IReservation): void {
    const allReservations = this.getReservations(); // Get all reservations

    const index = allReservations.findIndex(r => r.reservationId === reservation.reservationId);
    if (index !== -1) {
        allReservations[index].status = reservation.status;
        this.saveReservations(allReservations);
    }
  } 

  saveReservations(reservations: IReservation[]): void {
  localStorage.setItem('reservations', JSON.stringify(reservations));
  }



  clearReservationById(reservationId: number) : void {
    const reservations=this.getReservations();
    const currentReservations= reservations.filter(r => 
      r.reservationId !== reservationId
    );

    localStorage.setItem(this.storageKey,JSON.stringify(currentReservations));
  }

  getReservationById(reservation: IReservation): void{
    const reservations=this.getReservations();
    const currentReservation= reservations.find(r => 
      r.reservationId === reservation.reservationId
    )
    console.log(currentReservation);
  }

  getReservations(): IReservation[] {
    const reservations = localStorage.getItem(this.storageKey);
    return reservations ? JSON.parse(reservations) : [];
  }

  clearReservations(): void {
    localStorage.removeItem(this.storageKey);
  }

}