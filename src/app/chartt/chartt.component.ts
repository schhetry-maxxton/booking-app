import { Component, OnInit } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ReservationService } from '../Services/Reservation/reservation.service'; 
import { IRoomAvailability } from '../Interface/iroom-availability'; 
import { IRoom } from '../Interface/iroom';

interface Availability {
  start: number;
  end: number;
}

interface RoomData {
  room: number;
  availability: Availability[];
}

@Component({
  selector: 'app-chartt',
  templateUrl: './chartt.component.html',
  styleUrls: ['./chartt.component.css']
})
export class CharttComponent implements OnInit {

  ngOnInit(): void {
    
  }
  days: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

  rooms = [
    { roomId: 1, locationId: 101, roomName: 'Ocean View Suite' },
    { roomId: 2, locationId: 101, roomName: 'Garden Room' },
    { roomId: 3, locationId: 101, roomName: 'Deluxe Villa' },
    { roomId: 4, locationId: 101, roomName: 'Beachfront Bungalow' },
    { roomId: 5, locationId: 101, roomName: 'Family Suite' },
    { roomId: 6, locationId: 101, roomName: 'Poolside Room' },
    { roomId: 7, locationId: 101, roomName: 'Honeymoon Suite' },
    { roomId: 8, locationId: 101, roomName: 'Penthouse Suite' },
    { roomId: 9, locationId: 101, roomName: 'Standard Room' },
    { roomId: 10, locationId: 101, roomName: 'Executive Suite' },
    { roomId: 11, locationId: 102, roomName: 'Alpine Room' },
    { roomId: 12, locationId: 102, roomName: 'Chalet Suite' },
    { roomId: 13, locationId: 102, roomName: 'Rustic Cabin' },
    { roomId: 14, locationId: 102, roomName: 'Hillside Room' },
    { roomId: 15, locationId: 102, roomName: 'Lodge Suite' },
    { roomId: 16, locationId: 102, roomName: 'Summit View Room' },
    { roomId: 17, locationId: 102, roomName: 'Cozy Nook' },
    { roomId: 18, locationId: 102, roomName: 'Pine Forest Room' },
    { roomId: 19, locationId: 102, roomName: 'Luxe Suite' },
    { roomId: 20, locationId: 102, roomName: 'Woodland Retreat' },
  ];

  currentMonth: Date = new Date(); // Start with the current month
  daysInMonth: Date[] = [];

  isMouseDown = false;
  selectedCells: Set<string> = new Set();
 

  constructor() {
    this.updateDaysInMonth();
  }

  updateDaysInMonth() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate(); // Get the number of days in the month
    this.daysInMonth = Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
  }

  prevMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.updateDaysInMonth();
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    console.log(this.currentMonth)
    this.updateDaysInMonth();
  }

  onMouseDown(roomId: number, day: Date, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
    this.toggleSelection(roomId, day);
  }

  onMouseOver(roomId: number, day: Date, event: MouseEvent) {
    if (this.isMouseDown) {
      this.toggleSelection(roomId, day);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
  }

  toggleSelection(roomId: number, day: Date) {
    const cellKey = `${roomId}-${day.toISOString().split('T')[0]}`;
    if (this.selectedCells.has(cellKey)) {
      this.selectedCells.delete(cellKey);
    } else {
      this.selectedCells.add(cellKey);
    }
  }

  isSelected(roomId: number, day: Date): boolean {
    return this.selectedCells.has(`${roomId}-${day.toISOString().split('T')[0]}`);
  }
}
