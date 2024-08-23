import { Component, HostListener, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; // Import this if not already imported
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkDrag } from '@angular/cdk/drag-drop';

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
  selectedRoomId: number | null = null;
  startDay: number | undefined;
  endDay: number | undefined;
  // selectedCell: { roomId: number; day: number } | null = null; // Track selected cell
  isMouseDown = false;
  selectedCells: Set<string> = new Set();

  constructor(private reservationService: ReservationService) { }

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

  onMouseDown(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;

    // Check if there's an existing selection and clear it
    if (this.selectedRoomId !== null) {
      this.clearSelectionInRoom(this.selectedRoomId);
    }

    this.selectedRoomId = roomId;
    this.startDay = day; // Track the starting day
    this.toggleSelection(roomId, day);
  }

  onMouseOver(roomId: number, day: number, event: MouseEvent) {
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      this.endDay = day; // Track the ending day
      this.updateSelection(roomId);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
  }

  onCellClick(roomId: number, day: number): void {
    // Prevent new single-cell selections if there's an existing selection
    if (this.selectedRoomId !== null) {
      return;
    }

    if (this.getCellClass(roomId, day) === 'available') {
      this.toggleSelection(roomId, day);
    }
  }

  toggleSelection(roomId: number, day: number) {
    if (roomId !== this.selectedRoomId) return;

    const cellKey = `${roomId}-${day}`;
    if (this.selectedCells.has(cellKey)) {
      this.selectedCells.delete(cellKey);
    } else {
      this.selectedCells.add(cellKey);
    }
  }
  updateSelection(roomId: number) {
    if (this.startDay === undefined || this.endDay === undefined) return;

    const start = Math.min(this.startDay, this.endDay);
    const end = Math.max(this.startDay, this.endDay);

    // Clear previous selection and prepare new selection
    this.clearSelectionInRoom(roomId);

    const roomData = this.availabilityTable.find(data => data.roomId === roomId);

    if (!roomData) return;

    let currentStart = start;
    let currentEnd = end;

    // Ensure selection doesn't overlap with reservations
    roomData.reservations.forEach(reservation => {
      const reservationStart = reservation.start.getDate();
      const reservationEnd = reservation.end.getDate();

      // Adjust selection to end before the reservation starts
      if (currentStart <= reservationEnd && currentEnd >= reservationStart) {
        if (currentStart < reservationStart) {
          this.addSelection(currentStart, reservationStart - 1, roomId);
        }
        currentStart = Math.max(currentEnd + 1, reservationEnd + 1);
      }
    });

    // Add any remaining selection after the last reservation
    if (currentStart <= currentEnd) {
      this.addSelection(currentStart, currentEnd, roomId);
    }
  }

  addSelection(start: number, end: number, roomId: number) {
    for (let day = start; day <= end; day++) {
      this.toggleSelection(roomId, day);
    }
  }

  clearSelectionInRoom(roomId: number | null) {
    if (roomId === null) return;

    this.days.forEach(day => {
      const cellKey = `${roomId}-${day}`;
      if (this.selectedCells.has(cellKey)) {
        this.selectedCells.delete(cellKey);
      }
    });
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

    // Check if the date is within a reserved period
    const isBooked = roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );

    return isAvailable && !isBooked; // Only allow clicks if the cell is available and not reserved
  }

  logSelectedRange(): void {
    const selectedDates: { roomId: number; start: Date; end: Date }[] = [];

    this.availabilityTable.forEach(roomData => {
      const selectedDays = Array.from(this.selectedCells)
        .filter(cell => cell.startsWith(`${roomData.roomId}-`))
        .map(cell => parseInt(cell.split('-')[1], 10))
        .sort((a, b) => a - b);

      if (selectedDays.length > 0) {
        const start = new Date(this.year, this.selectedMonth - 1, selectedDays[0]);
        const end = new Date(this.year, this.selectedMonth - 1, selectedDays[selectedDays.length - 1]);

        selectedDates.push({
          roomId: roomData.roomId,
          start,
          end
        });
      }
    });
    console.log('Selected Date Ranges:', selectedDates);
  }
}
