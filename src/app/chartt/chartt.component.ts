import { Component, OnInit } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ReservationService } from '../Services/Reservation/reservation.service'; 
import { IRoomAvailability } from '../Interface/iroom-availability'; 
import { IRoom } from '../Interface/iroom';

Chart.register(...registerables);

@Component({
  selector: 'app-chartt',
  templateUrl: './chartt.component.html',
  styleUrls: ['./chartt.component.css']
})
export class CharttComponent implements OnInit {
  chart: Chart | undefined;

  rooms: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  availabilityTable: any[] = [];


  constructor(private reservationService: ReservationService) { }

  getRoomAvailability(): void {
    this.availabilityTable = this.stays.map(stay => {
      const room = this.rooms.find(room => room.roomId === stay.roomId);
      return { ...room, ...stay };
    });
  }
  ngOnInit(): void {
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Room 1','Room 2', 'Room 3','Room 4','Room 5','Room 6','Room 7','Room 8','Room 9','Room 10','Room 11','Room 12','Room 13','Room 14','Room 15','Room 16','Room 17','Room 18','Room 19','Room 20'],
        datasets: [{
          label: 'Room availability',
          data: [91,91,88,88,84,84,84,81,79,76,82,82,77,77,77,76,72,71,69,69],
          //  fill: false,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(255, 205, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(201, 203, 207, 0.2)'
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(255, 159, 64)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)',
            'rgb(201, 203, 207)'
          ],
          borderWidth: 1

        }]
      },
      options: {
        indexAxis: 'y', // This sets the chart to be horizontal
      },
    };

    this.chart = new Chart('chartCanvas', config);
  }
}
