import { Component, OnInit } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IReservation } from '../Interface/ireservation';

interface Availability {
  start: number;
  end: number;
}

interface RoomData {
  room: number;
  availability: Availability[];
}

@Component({
  selector: 'app-planning-chart',
  templateUrl: './planning-chart.component.html',
  styleUrls: ['./planning-chart.component.css']
})
export class PlanningChartComponent implements OnInit {
  months = [
    { name: 'January', value: 1 },
    { name: 'February', value: 2 },
    { name: 'March', value: 3 },
    { name: 'April', value: 4 },
    { name: 'May', value: 5 },
    { name: 'June', value: 6 },
    { name: 'July', value: 7 },
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 },
    { name: 'November', value: 11 },
    { name: 'December', value: 12 }
  ];

  room: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  availabilityTable: any[] = [];
  rooms: number[] = [];
  days: number[] = [];
  data: RoomData[] = [];
  selectedMonth: number = 1;

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.generateChart(this.selectedMonth);
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.room = rooms;
      this.stays = stays;
      this.rooms = this.room.map(r => r.roomId);
      this.getRoomAvailability();
    });
  }

  getRoomAvailability(): void {
    this.availabilityTable = this.stays.map(stay => {
      const room = this.room.find(room => room.roomId === stay.roomId);
      return { ...room, ...stay };
    });
    console.log(this.availabilityTable);
  }

  onMonthChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMonth = Number(target.value);
    this.generateChart(this.selectedMonth);
  }

  generateChart(month: number): void {
    const year = 2024; 
    const daysInMonth = new Date(year, month, 0).getDate();
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getCellClass(room: number, day: number): string {
    const roomData = this.data.find(r => r.room === room);
    const isAvailable = roomData && roomData.availability.some(
      (avail) => { 
        return day >= avail.start && day <= avail.end;
      });
    const dayOfWeek = new Date(2024, this.selectedMonth - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    return `${isAvailable ? 'available' : 'not-available'} ${isWeekend ? 'weekend' : ''}`;
  }

  getDayName(day: number): string {
    const year = 2024;
    const date = new Date(year, this.selectedMonth - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Sun", "Mon"
  }

  isWeekend(day: number): boolean {
    const year = 2024;
    const date = new Date(year, this.selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }
}
