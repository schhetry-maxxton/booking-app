import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IReservation } from '../Interface/ireservation';
import { RandomNumberService } from '../Services/RandomNumber/random-number.service';

@Component({
  selector: 'app-new-reservation',
  templateUrl: './new-reservation.component.html',
  styleUrl: './new-reservation.component.css',
})
export class NewReservationComponent implements OnInit{
  reservationForm: FormGroup;
  randomNumber: any;

  constructor(private fb: FormBuilder, private reservationService: ReservationService, private randomNumberService:RandomNumberService) {
    this.reservationForm = this.fb.group({
      reservationId: ['', Validators.required],
      roomId: ['', Validators.required],
      stayDateFrom: ['', Validators.required],
      stayDateTo: ['', Validators.required],
      numberOfDays: ['', Validators.required],
      totalNumberOfGuest: ['', Validators.required],
      pricePerDayPerPerson: ['', Validators.required],
      totalPrice: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  onSubmit(): void {
    if (this.reservationForm.valid ) {
      const reservation: IReservation = this.reservationForm.value;
    }
  }

  onClick(){
    this.randomNumber=generateRandomNumber();
  }
}

function generateRandomNumber(): number {
  return Math.floor(Math.random()* 900000 + 100000);
}

