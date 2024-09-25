import { Component, OnInit } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation2/reservation2.service';
import { IReservation } from '../Interface/ireservation';

@Component({
  selector: 'app-planning-chart',
  templateUrl: './planning-chart.component.html',
  styleUrls: ['./planning-chart.component.css']
})
export class PlanningChartComponent implements OnInit {
  // public barChartLabels: string[] = [
  //   'January', 'February', 'March', 'April', 'May', 'June', 
  //   'July', 'August', 'September', 'October', 'November', 'December'
  // ];
  // public barChartData = [
  //   {
  //     data: [], // Will be populated with reservation counts per month
  //     label: 'Reservations',
  //     backgroundColor: '#42A5F5',
  //     borderColor: '#1E88E5',
  //     hoverBackgroundColor: '#64B5F6',
  //     hoverBorderColor: '#1E88E5',
  //   }
  // ];

  // constructor(private reservationService: ReservationService) {}

  // ngOnInit(): void {
  //   this.loadReservations();
  // }

  // loadReservations(): void {
  //   const monthlyData = this.reservationService.getMonthlyReservations();
  //   const reservationCounts = monthlyData.map(data => data.reservations); // Extract reservation count
  //   this.barChartData[0].data = reservationCounts; // Set the data for the chart
  // }
  constructor(){}

  ngOnInit():void{

  }

  
}
