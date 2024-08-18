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
    // this.reservationService.getReservations()
    // .then(response =>{
    //   this.reservations=response.data;
    //   })
    //   .catch(error => {
    //     console.log(error);
    //     });

    this.reservations = this.reservationService.getReservations();
    return this.reservations;
    }
}
