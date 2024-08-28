import { Component, HostListener, OnInit } from '@angular/core';
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

  isReserved(roomId: number, day: number): boolean {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return false;

    return roomData.reservations.some(res => 
      day >= res.start.getDate() && day <= res.end.getDate()
    );
  }

  getTooltipText(roomId: number, day: number): string {
    const cellClass = this.getCellClass(roomId, day);
    if (cellClass === 'reserved') {
      // Replace with actual data retrieval logic
      return `Details for Room ${roomId} on ${day}`;
    }
    return '';
  }
  
  
  updateRoomAvailability(): void {
    const availabilityMap: { [roomId: number]: Availability[] } = {};
    const reservationMap: { [roomId: number]: Availability[] } = {};
    const minStayMap: { [roomId: number]: number } = {};
    const maxStayMap: { [roomId: number]: number } = {};
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
      arrivalDaysMap[roomId].add(day.toUpperCase()); // Add day names as strings
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
      arrivalDays: arrivalDaysMap[room.roomId] || new Set<string>() // Include arrival days
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
    this.addSelection(day, day, roomId); // initially takes single cell
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
  
  onCellClick(roomId: number, day: number): void {
    console.log("inside onCellClick");
    console.log("getCellClass : ", this.getCellClass(roomId, day));
  
    // Check if the clicked cell is available
    if (this.getCellClass(roomId, day) === 'available arrival-day') {
      console.log("cell available / clickable");
  
      // Clear any previous selections in the current room
      this.clearSelectionInRoom(roomId);
  
      // Add the clicked cell as the new selection
      this.addSelection(day, day, roomId);
  
      // Optionally, update any other state or UI components if needed
      this.startDay = day;
      this.endDay = day;
    }
  }
  

  updateSelection(roomId: number): void {
    if (this.startDay === undefined || this.endDay === undefined) return;
  
    console.log("in update selection");
    console.log("start day : ", this.startDay, " || end day " , this.endDay);
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    let currentStart = this.startDay;
    let currentEnd = this.endDay;
  
    // Handle selection within the constraints of reservations
    roomData.reservations.forEach(reservation => {
      const reservationStart = reservation.start.getDate();
      const reservationEnd = reservation.end.getDate();
  
      if (currentStart <= reservationEnd && currentEnd >= reservationStart) {
        // if (currentStart < reservationStart) {
        //   this.addSelection(currentStart, reservationStart - 1, roomId);
        // }
        currentStart = Math.max(currentEnd + 1, reservationEnd + 1);
      }
    });
  
    // Ensure the selection adheres to minStay and maxStay constraints
    const minStay = roomData.minStay;
    const maxStay = roomData.maxStay;
    const selectedLength = currentEnd - currentStart + 1;
  
    if (selectedLength < minStay) {
      currentEnd = Math.min(currentStart + minStay - 1, this.days[this.days.length - 1]);
    } else if (selectedLength > maxStay) {
      currentEnd = Math.min(currentStart + maxStay - 1, this.days[this.days.length - 1]);
    }
  
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
    console.log(roomData);
    
    if (!roomData) return;
    
    console.log("inside validateSelection ");
    
    const minStay = roomData.minStay;
    const maxStay = roomData.maxStay;

    console.log(" min stay : ",minStay);
    console.log(" max stay : ",maxStay);
    
  
    const selectedDays = Array.from(this.selectedCells)
      .filter(cell => cell.startsWith(`${roomId}-`))
      .map(cell => parseInt(cell.split('-')[1], 10))
      .sort((a, b) => a - b);
  
      console.log(" selected days  :", selectedDays);
      
     // to check if it is in the range  
    if (selectedDays.length < minStay || selectedDays.length > maxStay) {
      console.log("Selection must be >= minStay and <= maxStay ");
      this.clearAllSelections();
      return;
    }
  
    const start = selectedDays[0];
    const end = selectedDays[selectedDays.length - 1];
    if (this.checkOverlap(start, end, roomData)) {
      console.log("Overlapping ");
      this.clearAllSelections();
      return;
    }

    // this.openBookingModal(start, end, roomId);
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
  
    const weekDay = new Date(this.year, this.selectedMonth, day).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const isArrivalDay = roomData.arrivalDays.has(weekDay);
  
    return (isArrivalDay && isAvailable && !isBooked);
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