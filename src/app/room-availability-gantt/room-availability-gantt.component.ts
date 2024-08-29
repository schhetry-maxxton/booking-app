import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; 
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';

interface Availability {
  start: Date;
  end: Date;
}

interface RoomData {
  roomId: number;
  availability: Availability[];
  reservations: Availability[];
  arrivalDays: Set<string>;
  minStayMap: { [day: string]: number }; // e.g., { "MON": 2, "TUE": 3 }
  maxStayMap: { [day: string]: number }; 
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

  constructor(private reservationService: ReservationService, private modalService: NgbModal) {
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

  generateChart(month: number): void {
    const daysInMonth = new Date(this.year, month + 1, 0).getDate(); // month + 1 to get the correct number of days in the month
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getTooltipText(roomId: number, day: number): string {
    const cellClass = this.getCellClass(roomId, day);
    if (cellClass === 'reserved') {
      return `Details for Room ${roomId} on ${day}`;
    }
    return '';
  }
  
  
  updateRoomAvailability(): void {
    const availabilityMap: { [roomId: number]: Availability[] } = {};
    const reservationMap: { [roomId: number]: Availability[] } = {};
    // const minStayMap: { [roomId: number]: number } = {};
    // const maxStayMap: { [roomId: number]: number } = {};
    const minStayMap: { [roomId: number]: { [day: string]: number } } = {};
    const maxStayMap: { [roomId: number]: { [day: string]: number } } = {};
    const arrivalDaysMap: { [roomId: number]: Set<string> } = {};
  
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
        arrivalDaysMap[roomId] = new Set<string>();
      }
  
      const arrivalDays = stay.arrivalDays; // Array of day names like ["MON", "SUN"]

      arrivalDays.forEach(day => {
        const dayUpper = day.toUpperCase();
        arrivalDaysMap[roomId].add(dayUpper);
  
        if (!minStayMap[roomId]) {
          minStayMap[roomId] = {};
        }
        if (!maxStayMap[roomId]) {
          maxStayMap[roomId] = {};
        }
  
        // Set minStay and maxStay for each arrival day
        minStayMap[roomId][dayUpper] = Math.min(stay.minStay, minStayMap[roomId][dayUpper] || Number.MAX_SAFE_INTEGER);
        maxStayMap[roomId][dayUpper] = Math.max(stay.maxStay, maxStayMap[roomId][dayUpper] || 0);
      });
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
      arrivalDays: arrivalDaysMap[room.roomId] || new Set<string>(),
      minStayMap: minStayMap[room.roomId] || {}, // Use minStayMap instead of minStay
      maxStayMap: maxStayMap[room.roomId] || {}  // Use maxStayMap instead of maxStay
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
  
    const isReserved = roomData.reservations.some(
      (reserv) => date >= reserv.start && date <= reserv.end
    );
  
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); // Get day name
    const isArrivalDay = roomData.arrivalDays.has(dayName); // Check if day name is in arrivalDays
    
    const isSelected = this.selectedCells.has(`${roomId}-${day}`);
    if (isSelected) return 'selected';
    if (isReserved) return 'reserved';
    if (isAvailable && isArrivalDay) return  'available arrival-day';
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
    console.log(`on mouse down Room ID: ${roomId}, Day: ${day}`);
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
    event.preventDefault();
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      if (day >= (this.startDay || 0)) {
        this.endDay = day; // Update endDay as the mouse moves
        console.log("Insdide mouse over Start day : ",this.startDay);
        console.log("Insdide mouse over end day : ",this.endDay);
        this.updateSelection(roomId); // Update selection based on the new endDay
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    console.log("on mouse up");
    this.isMouseDown = false;
    if (this.selectedRoomId !== null) {
      this.validateSelection(this.selectedRoomId);
    }
  }

  updateSelection(roomId: number): void {
    if (this.startDay === undefined || this.endDay === undefined) return;
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    console.log("in update selection");
    console.log("start day : ", this.startDay, " || end day " , this.endDay);
  
    let currentStart = this.startDay;
    let currentEnd = this.endDay;
  
    if (this.checkOverlap(currentStart, currentEnd, roomData)) {
      console.log("Selection overlaps with a reservation. Clearing selection.");
      this.clearAllSelections();
    } else {
      this.addSelection(currentStart, currentEnd, roomId);
    }
    this.validateSelection(roomId);
  }
  
  checkOverlap(start: number, end: number, roomData: RoomData): boolean {
    return roomData.reservations.some(reservation => {
      const reservationStart = reservation.start.getDate();
      const reservationEnd = reservation.end.getDate();
      
      return start <= reservationEnd && end >= reservationStart;
    });
  }

  validateSelection(roomId: number): void {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
    
    console.log("Inside validateSelection");

    // Get the list of selected days for this roomId
    const selectedDays = Array.from(this.selectedCells)
        .filter(cell => cell.startsWith(`${roomId}-`))
        .map(cell => parseInt(cell.split('-')[1], 10))
        .sort((a, b) => a - b);

    console.log("Selected days:", selectedDays);

    if (selectedDays.length === 0) {
        console.log("No days selected.");
        return;
    }

    // Identify the start and end days from the selection
    const startDay = selectedDays[0];
    const endDay = selectedDays[selectedDays.length - 1];

    console.log("Start day:", startDay);
    console.log("End day:", endDay);

    // Using the first selected day to determine minStay
    const date = new Date(this.year, this.selectedMonth, startDay);
    // date.setHours(0, 0, 0, 0);
    const startDayString = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    // const endDayString = endDay.toString();

    const minStay = roomData.minStayMap[startDayString];
    const maxStay = roomData.maxStayMap[startDayString];

    console.log("Min stay:", minStay);
    console.log("Max stay:", maxStay);

    // Check if minStay or maxStay is undefined
    if (minStay === undefined || maxStay === undefined) {
        console.error("MinStay or MaxStay not found for the selected days:", selectedDays);
        this.clearAllSelections();
        return;
    }

    // Check for overlap or if the selection is within the allowed range
    const isOverlapping = this.checkOverlap(startDay, endDay, roomData);
    if (isOverlapping || selectedDays.length < minStay || selectedDays.length > maxStay) {
        console.log("Selection is invalid, clearing selection");
        this.clearAllSelections();
        return;
    }

    // If everything is valid, proceed to open the booking modal
    // this.openBookingModal(startDay, endDay, roomId);
}

  
  addSelection(start: number, end: number, roomId: number) {
    for (let day = start; day <= end; day++) {
      const cellKey = `${roomId}-${day}`;
      this.selectedCells.add(cellKey);
      console.log(this.selectedCells, "in add selection");
      console.log("RoomID - Day ", cellKey, "cell key added"); 
    }
  }

  clearSelectionInRoom(roomId: number | null) {
    if (roomId === null) return;

    this.days.forEach(day => {
      const cellKey = `${roomId}-${day}`;
      if (this.selectedCells.has(cellKey)) {

        this.selectedCells.delete(cellKey);
        console.log(this.selectedCells,"in clearSelection");
        
        console.log(cellKey, "cell key deleted");
        
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
  
    return (isAvailable && !isBooked);
  }

  openBookingModal(startDay: number, endDay: number, roomId: number): void {
    const modalRef = this.modalService.open(ModalComponent);
    const arrivalDate = new Date(this.year, this.selectedMonth, startDay);
    const departureDate = new Date(this.year, this.selectedMonth, endDay);
  
    modalRef.componentInstance.arrivalDate = arrivalDate;
    modalRef.componentInstance.departureDate = departureDate;
    modalRef.componentInstance.roomId = roomId;
  
    modalRef.result.then((result) => {
      console.log('Modal closed with result:', result);
    }, (reason) => {
      console.log('Modal dismissed with reason:', reason);
    });
  }

}