import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation2/reservation2.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-planning-chart',
  templateUrl: './planning-chart.component.html',
  styleUrls: ['./planning-chart.component.css']
})
export class PlanningChartComponent implements OnInit {
  chart: any;

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    // Fetch data from the reservation service
    const totalReservations = this.reservationService.calculateTotalReservationsByMonth();
    const confirmedReservations = this.reservationService.calculateConfirmedReservationsByMonth();
    const checkedInReservations = this.reservationService.calculateCheckedInReservationsByMonth();
    const checkedOutReservations = this.reservationService.calculateCheckedOutReservationsByMonth();
    const cancelledReservations = this.reservationService.calculateCancelledReservationsByMonth();

    // Prepare data arrays for the chart
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const totalData = this.getMonthlyDataFromMap(totalReservations);
    const confirmedData = this.getMonthlyDataFromMap(confirmedReservations);
    const checkedInData = this.getMonthlyDataFromMap(checkedInReservations);
    const checkedOutData = this.getMonthlyDataFromMap(checkedOutReservations);
    const cancelledData = this.getMonthlyDataFromMap(cancelledReservations);

    // Create the chart
    this.chart = new Chart('canvas', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Reservations',
            data: totalData,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
          },
          {
            label: 'Confirmed Reservations',
            data: confirmedData,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
          },
          {
            label: 'Checked-In Reservations',
            data: checkedInData,
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 2,
          },
          {
            label: 'Checked-Out Reservations',
            data: checkedOutData,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
          },
          {
            label: 'Cancelled Reservations',
            data: cancelledData,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback: function(value) { return Number.isInteger(value) ? value : null; } // Show only integers
            },
          },
        },
      },
    });
  }

  // getMonthlyData(reservations: { month: number, reservations: number }[]): number[] {
  //   const data = Array(12).fill(0);
  //   reservations.forEach(({ month, reservations }) => {
  //     data[month - 1] = reservations;
  //   });
  //   return data;
  // }

  // Helper function to convert map-based data to an array for each month
  getMonthlyDataFromMap(dataMap: { [key: string]: number }): number[] {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const data = Array(12).fill(0); // Array with 12 slots for 12 months
    months.forEach((month, index) => {
      const monthYear = `${month} ${new Date().getFullYear()}`; // Assume current year
      data[index] = dataMap[monthYear] || 0;
    });
    return data;
  }
}
