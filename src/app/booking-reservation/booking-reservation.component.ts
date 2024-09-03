import { Component } from '@angular/core';
import { IReservation } from '../Interface/ireservation';
import { ReservationService } from '../Services/Reservation/reservation.service'; 

@Component({
  selector: 'app-booking-reservation',
  templateUrl: './booking-reservation.component.html',
  styleUrl: './booking-reservation.component.css'
})
export class BookingReservationComponent {
  reservations: IReservation[]=[];

  constructor(private reservationService:ReservationService){}

  ngOnInit(){
    this.reservations = this.reservationService.getReservations();
    return this.reservations;
    }

    onStatusChange(reservation: IReservation): void {
      try {
        this.reservationService.updateReservationStatus(reservation);
        console.log('Reservation status updated successfully', reservation.status);
      } catch (error) {
        console.error('Error updating reservation status', error);
      }
    }
    
    removeReservation(reservationId: number): void{
      this.reservationService.clearReservationById(reservationId);
      this.ngOnInit();
    }

    
}
