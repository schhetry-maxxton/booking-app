import { Component, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
import { ReservationService } from '../Services/Reservation/reservation.service';

@Component({
  selector: 'app-room-availability-gantt',
  templateUrl: './room-availability-gantt.component.html',
  styleUrls: ['./room-availability-gantt.component.css']
})
export class RoomAvailabilityGanttComponent implements OnInit, AfterViewInit {
  data: any[] = []; // Define the data format for Gantt chart

  constructor(private reservationService: ReservationService, private el: ElementRef) {}

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(
      data => {
        // Merge data as required by your Gantt chart logic
        this.data = this.mergeData(data.rooms, data.stays);
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  mergeData(rooms: any[], stays: any[]): any[] {
    // Implement merging logic based on your requirements
    return []; // Return merged data
  }

  drawChart(): void {
    const svg = d3.select(this.el.nativeElement.querySelector('svg'));
    // Define dimensions and scales
    // Draw the Gantt chart using D3.js
    // Example: svg.append('rect').attr('width', 100).attr('height', 100).style('fill', 'blue');
  }
}
