import { Component, OnInit } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';

import { IRoom } from '../Interface/iroom';
import { RoomsService } from '../Services/Rooms/rooms.service'; 
import { IRoomAvailability } from '../Interface/iroom-availability'; 

@Component({
  selector: 'app-planning-chart',
  templateUrl: './planning-chart.component.html',
  styleUrls: ['./planning-chart.component.css']
})
export class PlanningChartComponent implements OnInit {

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: {
        beginAtZero: true
      },
      y: {
        beginAtZero: true
      }
    }
  };
  rooms: IRoom[] = [];
  availability: IRoomAvailability[] = [];
  
  constructor(private roomsService: RoomsService) { }

  async ngOnInit(): Promise<void> {
    try {
      // Fetch room data
      this.rooms = await this.roomsService.getRooms();
      
      // Mock availability data
      // Replace with real API call to fetch availability
      this.availability = await this.getRoomAvailability(); 
      
      // Transform data for chart
      this.prepareChartData();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  private async getRoomAvailability(): Promise<IRoomAvailability[]> {
   
    const response = await fetch('https://jadhavsudhit.github.io/Booking-module/stays.json');
    return await response.json();
  }

  private prepareChartData(): void {
   
    const labels = this.rooms.map(room => room.roomName);
    const availabilityData = this.rooms.map(room => {
      const roomAvailability = this.availability.find(avail => avail.roomId === room.roomId);
      return roomAvailability ? roomAvailability.maxStay - roomAvailability.minStay : 0;
    });

    this.chartData = {
      labels: labels,
      datasets: [
        {
          data: availabilityData,
          label: 'Room Availability (Days)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }
}
