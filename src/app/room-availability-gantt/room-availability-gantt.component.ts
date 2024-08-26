import { Component, HostListener, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; 

interface Availability {
  start: Date;
  end: Date;
  width?: number; 
  positionLeft?: number;
}

interface RoomData {
  arrivalDays: Set<number>; 
  roomId: number;
  availability: Availability[];
  reservations: Availability[];
  minStay: number; 
  maxStay: number; 
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
    const minStayMap: { [roomId: number]: number } = {};
    const maxStayMap: { [roomId: number]: number } = {};
    const arrivalDaysMap: { [roomId: number]: Set<number> } = {};
  
    this.stays.forEach(stay => {
      const roomId = stay.roomId;
      const startDate = new Date(stay.stayDateFrom);
      const endDate = new Date(stay.stayDateTo);
  
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
  
      if (!availabilityMap[roomId]) {
        availabilityMap[roomId] = [];
      }
  
      availabilityMap[roomId].push({
        start: startDate,
        end: endDate,
        width: this.calculateWidth(startDate, endDate),
        positionLeft: this.calculateLeftPosition(startDate)
      });
  
      if (!arrivalDaysMap[roomId]) {
        arrivalDaysMap[roomId] = new Set<number>();
      }
  
      // Populate arrivalDaysMap with only the days of the week
      const arrivalDays = stay.arrivalDays; // This should be an array of days like ["MON", "SUN"]
      const arrivalDayNumbers = arrivalDays.map(day => this.getDayNumber(day)); // Convert days to day numbers
  
      arrivalDayNumbers.forEach(day => {
        for (let d = startDate.getDate(); d <= endDate.getDate(); d++) {
          if (new Date(this.year, this.selectedMonth - 1, d).getDay() === day) {
            arrivalDaysMap[roomId].add(d);
          }
        }
      });
  
      if (minStayMap[roomId] === undefined || stay.minStay < minStayMap[roomId]) {
        minStayMap[roomId] = stay.minStay;
      }
      if (maxStayMap[roomId] === undefined || stay.maxStay > maxStayMap[roomId]) {
        maxStayMap[roomId] = stay.maxStay;
      }
    });
  
    this.reservations.forEach(reservation => {
      const roomId = reservation.roomId;
      const startDate = new Date(reservation.arrivalDate);
      const endDate = new Date(reservation.departureDate);
  
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
      reservations: reservationMap[room.roomId] || [],
      minStay: minStayMap[room.roomId] || 0, 
      maxStay: maxStayMap[room.roomId] || 0,
      arrivalDays: arrivalDaysMap[room.roomId] || new Set() // Include arrival days
    }));
  }
  
  getDayNumber(day: string): number {
    const daysMap: { [key: string]: number } = {
      'SUN': 0,
      'MON': 1,
      'TUE': 2,
      'WED': 3,
      'THU': 4,
      'FRI': 5,
      'SAT': 6
    };
    return daysMap[day.toUpperCase()];
  }

  
  generateChart(month: number): void {
    const daysInMonth = new Date(this.year, month, 0).getDate();
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getCellClass(roomId: number, day: number): string {
    const date = new Date(this.year, this.selectedMonth - 1, day);
    date.setHours(0, 0, 0, 0); 
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return '';
  
    const isAvailable = roomData.availability.some(
      (avail) => date >= avail.start && date <= avail.end
    );
    const isArrivalDay = roomData.arrivalDays.has(day);
    const isReserved = roomData.reservations.some(
      (reserv) => date >= reserv.start && date <= reserv.end
    );
  
    const isSelected = this.selectedCells.has(`${roomId}-${day}`);
    if (isSelected) return 'selected'; // Blue color for selected cells
    if (isReserved) return 'reserved'; // Red color for reservations
    if (isAvailable && isArrivalDay) return 'available arrival-day'; // Slightly greener color for arrival days
    if (isAvailable) return 'available'; // Default green color for available days
    return 'not-available'; // Default color for unavailable days
  }
  
  
  
  calculateWidth(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Add 1 to include both start and end dates
    return daysDiff * 20;
  }

  calculateLeftPosition(startDate: Date): number {
    return (startDate.getDate() - 1) * 20; 
  }

  onMonthChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMonth = Number(target.value);
    this.generateChart(this.selectedMonth);
    this.clearAllSelections();
  }

  getDayName(day: number): string {
    const year = 2024;
    const date = new Date(year, this.selectedMonth - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Sun", "Mon"
  }

  isWeekend(day: number): boolean {
    const year=2024;
    const date = new Date(this.year, this.selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  onMouseDown(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;

    if (this.selectedRoomId !== null) {
      this.clearSelectionInRoom(this.selectedRoomId);
    }

    this.selectedRoomId = roomId;
    this.startDay = day; // mark the start day
    this.toggleSelection(roomId, day);
  }

  onMouseOver(roomId: number, day: number, event: MouseEvent) {
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      this.endDay = day; // mark the end day
      this.updateSelection(roomId);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
    if (this.selectedRoomId !== null) {
      this.validateSelection(this.selectedRoomId);
    }
  }
  
  onCellClick(roomId: number, day: number): void {
   
    if (this.selectedRoomId !== null) {  // Prevent new single-cell selections if there's an existing selection
      return;
    }

    if (this.getCellClass(roomId, day) === 'available') {
      this.toggleSelection(roomId, day);
    }
  }

  toggleSelection(roomId: number, day: number) {
    if (roomId !== this.selectedRoomId) {
      return;
    }
    const cellKey = `${roomId}-${day}`;

    if (this.selectedCells.has(cellKey)) {
      this.selectedCells.delete(cellKey);
    } else {
      this.selectedCells.add(cellKey);
    }
  }

  updateSelection(roomId: number): void {
    if (this.startDay === undefined || this.endDay === undefined) {
      return;
    }
  
    const start = Math.min(this.startDay, this.endDay);
    const end = Math.max(this.startDay, this.endDay);
    
    this.clearSelectionInRoom(roomId);
    
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) {
      return;
    }
  
    let currentStart = start;
    let currentEnd = end;
    
    roomData.reservations.forEach(reservation => {
      const reservationStart = reservation.start.getDate();
      const reservationEnd = reservation.end.getDate();
    
      if (currentStart <= reservationEnd && currentEnd >= reservationStart) {
        if (currentStart < reservationStart) {
          this.addSelection(currentStart, reservationStart - 1, roomId);
        }
        currentStart = Math.max(currentEnd + 1, reservationEnd + 1);
      }
    });
    
    if (currentStart <= currentEnd) {
      this.addSelection(currentStart, currentEnd, roomId);
    }
    this.validateSelection(roomId);
  }
  
  
  //helper for yhe update selection to avoid edgecase
  checkOverlap(start: number, end: number, roomData: RoomData): boolean {
    return roomData.reservations.some(reservation => {
      const reservStart = reservation.start.getDate();
      const reservEnd = reservation.end.getDate();
      return (start <= reservEnd && end >= reservStart);
    });
  }

  //helper 2
  validateSelection(roomId: number): void {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    const minStay = roomData.minStay;
    const maxStay = roomData.maxStay;
  
    const selectedDays = Array.from(this.selectedCells)
      .filter(cell => cell.startsWith(`${roomId}-`))
      .map(cell => parseInt(cell.split('-')[1], 10))
      .sort((a, b) => a - b);
  
    if (selectedDays.length < minStay || selectedDays.length > maxStay) {
      this.clearAllSelections();
      return;
    }
  
    const start = selectedDays[0];
    const end = selectedDays[selectedDays.length - 1];
    if (this.checkOverlap(start, end, roomData)) {
      this.clearAllSelections();
      return;
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

  clearAllSelections() {
    this.selectedCells.clear();
  }
  
  isSelected(roomId: number, day: number): boolean {
    return this.selectedCells.has(`${roomId}-${day}`);
  }

  isCellClickable(roomId: number, day: number): boolean {
    const date = new Date(this.year, this.selectedMonth - 1, day);
    date.setHours(0, 0, 0, 0);
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return false;
  
    const isAvailable = roomData.availability.some(
      avail => date >= avail.start && date <= avail.end
    );
    const isBooked = roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );
  
    const isArrivalDay = roomData.arrivalDays.has(day);
  
    return (isAvailable && !isBooked) || (this.isSelected(roomId, day)); // Allow selection on arrival days and extend selection
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