import { Component, HostListener, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; // Import this if not already imported
import {OverlayModule} from '@angular/cdk/overlay';
import {CdkDrag} from '@angular/cdk/drag-drop';

interface Availability {
  start: Date;
  end: Date;
  width?: number; // To track the width of the resizable cell
  positionLeft?: number;
}

interface RoomData {
  roomId: number;
  availability: Availability[];
  reservations: Availability[];
}

@Component({
  selector: 'app-room-availability-gantt',
  templateUrl: './room-availability-gantt.component.html',
  styleUrls: ['./room-availability-gantt.component.css']
})
export class RoomAvailabilityGanttComponent implements OnInit {

  months = [
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 }
  ];

  rooms: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  reservations: IReservation[] = [];
  availabilityTable: RoomData[] = [];
  days: number[] = [];
  selectedMonth: number = 8;
  year: number = 2024;
  // selectedCell: { roomId: number; day: number } | null = null; // Track selected cell
  isMouseDown = false;
  selectedCells: Set<string> = new Set();
  
  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.reservations = this.reservationService.getReservations();
      this.updateRoomAvailability();
      this.generateChart(this.selectedMonth);
    });
  }

  updateRoomAvailability(): void {
    const availabilityMap: { [roomId: number]: Availability[] } = {};
    const reservationMap: { [roomId: number]: Availability[] } = {};

    this.stays.forEach(stay => {
      const roomId = stay.roomId;
      const startDate = new Date(stay.stayDateFrom);
      const endDate = new Date(stay.stayDateTo);

      // Normalize dates to start at midnight to avoid timezone issues
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (!availabilityMap[roomId]) {
        availabilityMap[roomId] = [];
      }

      availabilityMap[roomId].push({
        start: startDate,
        end: endDate,
        width: this.calculateWidth(startDate, endDate), // Correct width calculation
        positionLeft: this.calculateLeftPosition(startDate) // Correct position calculation
      });
    });

    this.reservations.forEach(reservation => {
      const roomId = reservation.roomId;
      const startDate = new Date(reservation.arrivalDate);
      const endDate = new Date(reservation.departureDate);

      // Normalize dates to start at midnight to avoid timezone issues
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (!reservationMap[roomId]) {
        reservationMap[roomId] = [];
      }

      reservationMap[roomId].push({
        start: startDate,
        end: endDate
      });
    });

    this.availabilityTable = this.rooms.map(room => ({
      roomId: room.roomId,
      availability: availabilityMap[room.roomId] || [],
      reservations: reservationMap[room.roomId] || []
    }));
  }

  generateChart(month: number): void {
    const daysInMonth = new Date(this.year, month, 0).getDate();
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getCellClass(roomId: number, day: number): string {
    const date = new Date(this.year, this.selectedMonth - 1, day);
    date.setHours(0, 0, 0, 0); // Normalize date to start at midnight
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return '';
  
    const isAvailable = roomData.availability.some(
      avail => date >= avail.start && date <= avail.end
    );
  
    const isReserved = roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );
  
    const isSelected = this.selectedCells.has(`${roomId}-${day}`);
    if (isReserved) return 'reserved'; // Red color for reservations
    if (isAvailable) return isSelected ? 'selected available' : 'available'; // Green color for availability
    if (isSelected) return 'selected'; // Blue colour for selected cells
    return 'not-available'; // Default color
  }

//   getCellClass(roomId: number, day: number): string {
//   const baseClass = this.selectedCell && this.selectedCell.roomId === roomId && this.selectedCell.day === day
//     ? 'highlight'
//     : '';

//   const date = new Date(this.year, this.selectedMonth - 1, day);
//   date.setHours(0, 0, 0, 0); // Normalize date to start at midnight

//   const roomData = this.availabilityTable.find(data => data.roomId === roomId);

//   if (!roomData) return baseClass;

//   const isAvailable = roomData.availability.some(
//     avail => date >= avail.start && date <= avail.end
//   );

//   const isReserved = roomData.reservations.some(
//     reserv => date >= reserv.start && date <= reserv.end
//   );

//   if (isReserved) return `${baseClass} reserved`; // Red color for reservations
//   if (isAvailable) return `${baseClass} available`; // Green color for availability
//   return `${baseClass} not-available`; // Default color
// }


  calculateWidth(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Add 1 to include both start and end dates
    return daysDiff * 20; // Adjust width per day as needed
  }

  calculateLeftPosition(startDate: Date): number {
    return (startDate.getDate() - 1) * 20; // Adjust left position per day as needed
  }

  onMonthChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMonth = Number(target.value);
    this.generateChart(this.selectedMonth);
  }

  isWeekend(day: number): boolean {
    const date = new Date(this.year, this.selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
  
  // onCellClick(roomId: number, day: number): void {
  //   if (this.getCellClass(roomId, day) === 'available') {
  //     this.selectedCell = { roomId, day };
  //   }
  // }

  onMouseDown(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
    this.toggleSelection(roomId, day);
  }

  onMouseOver(roomId: number, day: number, event: MouseEvent) {
    if (this.isMouseDown) {
      this.toggleSelection(roomId, day);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
  }

  toggleSelection(roomId: number, day: number) {
    const cellKey = `${roomId}-${day}`;
    
    // Find the availability range for the room
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    // Get the start date of the selection
    const startDate = new Date(this.year, this.selectedMonth - 1, day);
    startDate.setHours(0, 0, 0, 0);
  
    // Check for booked dates and ensure selection starts again after a booked period
    const isValidSelection = roomData.availability.some(avail => 
      startDate >= avail.start && startDate <= avail.end &&
      !roomData.reservations.some(reserv => 
        startDate >= reserv.start && startDate <= reserv.end
      )
    );
    
    if (!isValidSelection) return;
    
    if (this.selectedCells.has(cellKey)) {
      this.selectedCells.delete(cellKey);
    } else {
      this.selectedCells.add(cellKey);
    }
  }
  

  isSelected(roomId: number, day: number): boolean {
    return this.selectedCells.has(`${roomId}-${day}`);
  }
 
  isCellClickable(roomId: number, day: number): boolean {
    const date = new Date(this.year, this.selectedMonth - 1, day);
    date.setHours(0, 0, 0, 0); // Normalize date to start at midnight
    
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    
    if (!roomData) return false;
    
    const isAvailable = roomData.availability.some(
      avail => date >= avail.start && date <= avail.end
    );
    
    if (!isAvailable) return false;
    
    // Check for overlapping booked dates
    return !roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );
  }
  
}
