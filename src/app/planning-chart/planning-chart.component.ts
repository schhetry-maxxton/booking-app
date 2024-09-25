import { Component, Input, OnInit } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation2/reservation2.service';
import { IReservation } from '../Interface/ireservation';
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
    // Fetch data for the chart from the service
    const totalReservations = this.reservationService.getMonthlyReservations();
    const confirmedReservations = this.reservationService.calculateConfirmedReservationsByMonth();
    const checkedInReservations = this.reservationService.calculateCheckedInReservationsByMonth();
    const checkedOutReservations = this.reservationService.calculateCheckedOutReservationsByMonth();

    // Prepare data arrays for each dataset
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const totalData = this.getMonthlyData(totalReservations);
    const confirmedData = this.getMonthlyDataFromMap(confirmedReservations);
    const checkedInData = this.getMonthlyDataFromMap(checkedInReservations);
    const checkedOutData = this.getMonthlyDataFromMap(checkedOutReservations);

    // Initialize the chart with the fetched data
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
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1, // Ensure ticks are at intervals of 1
              callback: function(value) { return Number.isInteger(value) ? value : null; } // Show only integers
            },
          },
        },
      },
    });
  }

  // Helper function to convert month-wise data to an array (total reservations)
  getMonthlyData(reservations: { month: number, reservations: number }[]): number[] {
    const data = Array(12).fill(0); // Array with 12 slots for 12 months
    reservations.forEach(({ month, reservations }) => {
      data[month - 1] = reservations; // Month starts from 1 (Jan), so adjust index
    });
    return data;
  }

  // Helper function to convert map-based data (e.g., confirmed, checked-in, etc.)
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

  
