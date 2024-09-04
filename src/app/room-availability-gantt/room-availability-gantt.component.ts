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
  arrivalDays: { [day: string]: string[] }; 
  departureDays: Set<string>;
  minStayMap: { [day: string]: number }; 
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
  selectedMonth: number; 
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

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.reservations = this.reservationService.getReservations();
      this.updateRoomAvailability();
      this.generateChart(this.selectedMonth);
    });
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

  generateChart(month: number): void {
    const daysInMonth = new Date(this.year, month + 1, 0).getDate(); 
    this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  hasReservation(roomId: number, day: number): boolean {
    const date = new Date(this.year, this.selectedMonth, day);
    return this.reservations.some(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate).toDateString() === date.toDateString()
    );
  }

  getCustomerName(roomId: number, day: number): string {
    const date = new Date(this.year, this.selectedMonth, day);
    const reservation = this.reservations.find(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate).toDateString() === date.toDateString()
    );
    return reservation ? `${reservation.firstName} ${reservation.middleName} ${reservation.lastName}` : '';
  }
  
  updateRoomAvailability(): void {
    const availabilityMap: { [roomId: number]: Availability[] } = {};
    const reservationMap: { [roomId: number]: Availability[] } = {};
    const arrivalDaysMap: { [roomId: number]: { [day: string]: string[] } } = {}; 
    const departureDaysMap: { [roomId: number]: Set<string> } = {};
    const minStayMap: { [roomId: number]: { [day: string]: number } } = {};
    const maxStayMap: { [roomId: number]: { [day: string]: number } } = {};

    this.stays.forEach(stay => {
      const roomId = stay.roomId;
      const startDate = new Date(stay.stayDateFrom);
      const endDate = new Date(stay.stayDateTo);
    
      startDate.setHours(12, 0, 0, 0);  // Arrival time 12:00pm
      endDate.setHours(11, 0, 0, 0); 
    
      if (!availabilityMap[roomId]) {
        availabilityMap[roomId] = [];
      }
    
      availabilityMap[roomId].push({
        start: startDate,
        end: endDate
      });
    
      if (!arrivalDaysMap[roomId]) {
        arrivalDaysMap[roomId] = {};
      }
    
      stay.arrivalDays.forEach(arrivalDay => {
        const arrivalDayUpper = arrivalDay.toUpperCase();
        if (!arrivalDaysMap[roomId][arrivalDayUpper]) {
          arrivalDaysMap[roomId][arrivalDayUpper] = [];
        }
        stay.departureDays.forEach(departureDay => {
          arrivalDaysMap[roomId][arrivalDayUpper].push(departureDay.toUpperCase());
        });
    
        if (!minStayMap[roomId]) {
          minStayMap[roomId] = {};
        }
        if (!maxStayMap[roomId]) {
          maxStayMap[roomId] = {};
        }
    
        minStayMap[roomId][arrivalDayUpper] = Math.min(stay.minStay, minStayMap[roomId][arrivalDayUpper] || Number.MAX_SAFE_INTEGER);
        maxStayMap[roomId][arrivalDayUpper] = Math.max(stay.maxStay, maxStayMap[roomId][arrivalDayUpper] || 0);
      });
    
      stay.departureDays.forEach(departureDay => {
        const departureDayUpper = departureDay.toUpperCase();
        departureDaysMap[roomId] = departureDaysMap[roomId] || new Set<string>();
        departureDaysMap[roomId].add(departureDayUpper);
      });
    });
    
    this.reservations.forEach(reservation => {
      const roomId = reservation.roomId;
      const startDate = new Date(reservation.arrivalDate);
      const endDate = new Date(reservation.departureDate);

      startDate.setHours(12, 0, 0, 0); // Arrival time: 12 PM
      endDate.setHours(11, 0, 0, 0);   // Departure time: 11 AM

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
      arrivalDays: arrivalDaysMap[room.roomId] || {}, 
      departureDays: departureDaysMap[room.roomId] || new Set<string>(),
      minStayMap: minStayMap[room.roomId] || {}, 
      maxStayMap: maxStayMap[room.roomId] || {}  
    }));
    console.log(this.availabilityTable);
  }
  
  // getCellClass(roomId: number, day: number): string {
  //   const date = new Date(this.year, this.selectedMonth, day);
  //   const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
  //   if (!roomData) return '';
  
  //   const isAvailable = roomData.availability.some(
  //     (avail) => date >= avail.start && date <= avail.end
  //   );
  
  //   const isReserved = roomData.reservations.some(
  //     (reserv) => date >= reserv.start && date <= reserv.end
  //   );

  //   const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  //   const isArrivalDay = roomData.arrivalDays[dayName] ? true : false;

  //   const cellClass = isReserved
  //     ? 'reserved'
  //     : isAvailable && isArrivalDay
  //     ? 'available'
  //     : 'not-available';
  
  //   return cellClass;
  // }

  getCellClass(roomId: number, day: number): string {
    const date = new Date(this.year, this.selectedMonth, day);
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return '';
  
    const isAvailable = roomData.availability.some(
      (avail) => date >= avail.start && date <= avail.end
    );
  
    const isReserved = roomData.reservations.some(
      (reserv) => date >= reserv.start && date <= reserv.end
    );

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const isArrivalDay = roomData.arrivalDays[dayName] ? true : false;

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
    return date.getDay() === 6 || date.getDay() === 0;
  }
  
  onMouseDown(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
  
    if (this.selectedRoomId !== null) {
      this.clearSelectionInRoom(this.selectedRoomId);
    }
    
    this.selectedRoomId = roomId;
    this.startDay = day;
    this.addSelection(day, day, roomId); 
  }

  onMouseOver(roomId: number, day: number, event: MouseEvent) {
    event.preventDefault();
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      if (day >= (this.startDay || 0)) {
        this.endDay = day; // Update endDay as the mouse moves
        this.updateSelection(roomId); // Update selection based on the new endDay
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isMouseDown = false;
    if (this.selectedRoomId !== null) {
      this.validateSelection(this.selectedRoomId);
      if (this.selectedCells.size > 0) {
        const selectedDays = Array.from(this.selectedCells)
          .filter(cell => cell.startsWith(`${this.selectedRoomId}-`))
          .map(cell => parseInt(cell.split('-')[1], 10))
          .sort((a, b) => a - b);
  
        if (selectedDays.length > 0) {
          const startDay = selectedDays[0];
          const endDay = selectedDays[selectedDays.length - 1];
  
          const arrivalDate = new Date(this.year, this.selectedMonth, startDay);
          const departureDate = new Date(this.year, this.selectedMonth, endDay + 1); // Adjusted for full day
  
          // Adjust times according to the specified logic
          arrivalDate.setHours(12, 0, 0, 0);
          departureDate.setHours(11, 0, 0, 0);
  
          const roomDetails = this.rooms.find(room => room.roomId === this.selectedRoomId);
          if (roomDetails) {
            const bookingDetails = {
              roomId: roomDetails.roomId,
              locationId: roomDetails.locationId,
              roomName: roomDetails.roomName,
              pricePerDayPerPerson: roomDetails.pricePerDayPerPerson,
              arrivalDate: arrivalDate,
              departureDate: departureDate,
              locationName: roomDetails.locationName
            };
            this.openBookingModal(bookingDetails);
          }
        }
      }
    }
  }
  

  updateSelection(roomId: number): void {
    if (this.startDay === undefined || this.endDay === undefined) return;
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    let currentStart = this.startDay;
    let currentEnd = this.endDay;
  
    if (this.checkOverlap(currentStart, currentEnd, roomData)) {
      this.clearAllSelections();
    } else {
      this.addSelection(currentStart, currentEnd, roomId);
    }
    this.validateSelection(roomId);
  }
  
  checkOverlap(start: number, end: number, roomData: RoomData): boolean {
    const startDate = new Date(this.year, this.selectedMonth, start);
    const endDate = new Date(this.year, this.selectedMonth, end);

    return roomData.reservations.some(reservation => {
      const reservationStart = new Date(reservation.start);
      const reservationEnd = new Date(reservation.end);

      return startDate <= reservationEnd && endDate >= reservationStart;
    });
  }

  validateSelection(roomId: number): void {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    const selectedDays = Array.from(this.selectedCells)
      .filter(cell => cell.startsWith(`${roomId}-`))
      .map(cell => parseInt(cell.split('-')[1], 10))
      .sort((a, b) => a - b);
  
    if (selectedDays.length === 0) {
      return;
    }
  
    const startDay = selectedDays[0];
    const endDay = selectedDays[selectedDays.length - 1];
  
    const startDate = new Date(this.year, this.selectedMonth, startDay);
    const endDate = new Date(this.year, this.selectedMonth, endDay + 1); // To include the last night
  
    // Adjust times according to the specified logic
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(11, 0, 0, 0);
  
    const stayLength = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
    const startDayString = startDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const endDayString = endDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  
    const availabilityWindow = roomData.availability.find(avail =>
      avail.start <= startDate && avail.end >= endDate
    );
  
    if (!availabilityWindow) {
      this.clearAllSelections();
      return;
    }
  
    const validDepartureDays = roomData.departureDays;
    const validArrivalDays = roomData.arrivalDays[startDayString] || [];
  
    if (!validArrivalDays.includes(endDayString) || !validDepartureDays.has(endDayString)) {
      this.clearAllSelections();
      return;
    }
  
    const minStay = roomData.minStayMap[startDayString] || 1;
    const maxStay = roomData.maxStayMap[startDayString] || Number.MAX_SAFE_INTEGER;
  
    if (stayLength < minStay || stayLength > maxStay || !validDepartureDays.has(endDayString) || this.checkOverlap(startDay, endDay, roomData)) {
      this.clearAllSelections();
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

  openBookingModal(bookingDetails: any): void {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.bookingDetails = bookingDetails;

    modalRef.result.then((result) => {
        this.ngOnInit();
        this.clearAllSelections();
    }, (reason) => {
        this.clearAllSelections();
    });
  }
}
