import { Component, HostListener, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; 

interface Availability {
  start: Date;
  end: Date;
}

interface RoomData {
  roomId: number;
  availability: Availability[];
  reservations: Availability[];
  arrivalDays: Set<number>;
  minStay: number; // Optional if not always present
  maxStay: number; // Optional if not always present
}

@Component({
  selector: 'app-room-availability-gantt',
  templateUrl: './room-availability-gantt.component.html',
  styleUrls: ['./room-availability-gantt.component.css']
})
export class RoomAvailabilityGanttComponent implements OnInit {

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  rooms: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  reservations: IReservation[] = [];
  availabilityTable: RoomData[] = [];
  days: number[] = [];
  selectedMonth: number; // Index of the month (0-11)
  year: number;
  selectedRoomId: number | null = null;
  startDay: number | undefined;
  endDay: number | undefined;
  isMouseDown = false;
  selectedCells: Set<string> = new Set();

  constructor(private reservationService: ReservationService) {
    const today = new Date();
    this.selectedMonth = today.getMonth(); // Index of the current month
    this.year = today.getFullYear();
  }

  getMonthName(): string {
    return this.months[this.selectedMonth];
  }

  changeMonth(direction: number) {
    this.selectedMonth += direction;
    if (this.selectedMonth < 0) {
      this.selectedMonth = 11;
      this.year--;
    } else if (this.selectedMonth > 11) {
      this.selectedMonth = 0;
      this.year++;
    }
    this.generateChart(this.selectedMonth);
    this.clearAllSelections();
  }

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.reservations = this.reservationService.getReservations();
      this.updateRoomAvailability();
      this.generateChart(this.selectedMonth);
    });
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
    const daysInMonth = new Date(this.year, month + 1, 0).getDate(); // month + 1 to get the correct number of days in the month
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getTooltipContent(roomId: number, day: number): string | null {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return null;

    const date = new Date(this.year, this.selectedMonth, day);
    const isReserved = roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );

    if (isReserved) {
      const reservation = roomData.reservations.find(
        reserv => date >= reserv.start && date <= reserv.end
      );
      const reservationStart = reservation?.start.toLocaleDateString() || '';
      const reservationEnd = reservation?.end.toLocaleDateString() || '';
      return `Reserved from ${reservationStart} to ${reservationEnd}`;
    }
    return null;
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
        end: endDate
      });
  
      if (!arrivalDaysMap[roomId]) {
        arrivalDaysMap[roomId] = new Set<number>();
      }
  
      const arrivalDays = stay.arrivalDays; // This should be an array of days like ["MON", "SUN"]
      const arrivalDayNumbers = arrivalDays.map(day => this.getDayNumber(day)); // Convert days to day numbers
  
      arrivalDayNumbers.forEach(day => {
        for (let d = startDate.getDate(); d <= endDate.getDate(); d++) {
          if (new Date(this.year, this.selectedMonth, d).getDay() === day) {
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
      availability: availabilityMap[room.roomId] || [], // Merge overlapping slots
      reservations: reservationMap[room.roomId] || [],
      minStay: minStayMap[room.roomId] || 0,
      maxStay: maxStayMap[room.roomId] || 0,
      arrivalDays: arrivalDaysMap[room.roomId] || new Set() // Include arrival days
    }));
  }
  
  getCellClass(roomId: number, day: number): string {
    const date = new Date(this.year, this.selectedMonth, day);
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
    if (isSelected) return 'selected';
    if (isReserved) return 'reserved';
    if (isAvailable && isArrivalDay) return 'available arrival-day';
    if (isAvailable) return 'available';
    return 'not-available';
  }

  getDayName(day: number): string {
    const date = new Date(this.year, this.selectedMonth, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  }

  isWeekend(day: number): boolean {
    const date = new Date(this.year, this.selectedMonth, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  onMouseDown(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
  
    if (this.selectedRoomId !== null) {
      this.clearSelectionInRoom(this.selectedRoomId);
    }
    this.selectedRoomId=roomId;
    this.startDay=day;
    this.addSelection(day, day, roomId);
  }

  onMouseOver(roomId: number, day: number, event: MouseEvent) {
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      if (day >= (this.startDay || 0)) {
        this.endDay = day;
        this.updateSelection(roomId);
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
    if (this.selectedRoomId !== null) {
      this.validateSelection(this.selectedRoomId);
    }
  }
  
  onCellClick(roomId: number, day: number): void {
    if (this.getCellClass(roomId, day) === 'available') {
      const roomData = this.availabilityTable.find(data => data.roomId === roomId);
        if (roomData) {
            const minStay = roomData.minStay;
            // Select cells from the clicked cell to the right for the minimum stay duration
            this.cellRange(day, minStay, roomId);
        }
    }
  }

  cellRange(startDay: number, minStay: number, roomId: number): void {
    const endDay = Math.min(startDay + minStay - 1, this.days[this.days.length - 1]); // Ensure endDay is within the month
    this.addSelection(startDay, endDay, roomId);
  }

  updateSelection(roomId: number): void {
    if (this.startDay === undefined || this.endDay === undefined) return;
  
    const start = Math.min(this.startDay, this.endDay);
    const end = Math.max(this.startDay, this.endDay);
  
    this.clearSelectionInRoom(roomId);
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
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
  
  checkOverlap(start: number, end: number, roomData: RoomData): boolean {
    return roomData.reservations.some(reservation => {
      const reservStart = reservation.start.getDate();
      const reservEnd = reservation.end.getDate();
      return (start <= reservEnd && end >= reservStart);
    });
  }

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
      const cellKey = `${roomId}-${day}`;
      this.selectedCells.add(cellKey);
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
    const date = new Date(this.year, this.selectedMonth, day);
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
  
    return (isArrivalDay && isAvailable && !isBooked) || (this.isSelected(roomId, day));
  }
  
  logSelectedRange(): void {
    const selectedDates: { roomId: number; start: Date; end: Date }[] = [];

    this.availabilityTable.forEach(roomData => {
      const selectedDays = Array.from(this.selectedCells)
        .filter(cell => cell.startsWith(`${roomData.roomId}-`))
        .map(cell => parseInt(cell.split('-')[1], 10))
        .sort((a, b) => a - b);

      if (selectedDays.length > 0) {
        const start = new Date(this.year, this.selectedMonth, selectedDays[0]);
        const end = new Date(this.year, this.selectedMonth, selectedDays[selectedDays.length - 1]);

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