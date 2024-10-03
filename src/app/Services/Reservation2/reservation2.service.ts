import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IReservation } from '../../Interface/ireservation';
import { IRoomAvailability } from '../../Interface/iroom-availability';
import { IRoomWithAvailability } from '../../Interface/rooms-with-availability';
import { forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ReservationService {
  private storageKey = 'reservations';
  // private reservations: IReservation[] = [];
  
  private roomsUrl = 'https://jadhavsudhit.github.io/Booking-module/rooms.json';
  private staysUrl = 'https://jadhavsudhit.github.io/Booking-module/stays.json';

  constructor(private http: HttpClient) { }

  getRoomsAndStays(): Observable<{ rooms: IRoomWithAvailability[], stays: IRoomAvailability[] }> {
    return forkJoin({
      rooms: this.http.get<IRoomWithAvailability[]>(this.roomsUrl),
      stays: this.http.get<IRoomAvailability[]>(this.staysUrl)
    });
  }

  saveReservation(reservation: IReservation): void {
    const existingReservations = this.getReservations();
    existingReservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(existingReservations));
  }

  // updateReservationStatus(reservation: IReservation): void {
  //   const allReservations = this.getReservations(); // Get all reservations

  //   const index = allReservations.findIndex(r => r.reservationId === reservation.reservationId);
  //   if (index !== -1) {
  //       allReservations[index].status = reservation.status;
  //       this.saveReservations(allReservations);
  //   }
  // } 

  updateReservationStatus(reservation: IReservation): void {
    const allReservations = this.getReservations(); // Get all reservations
  
    const index = allReservations.findIndex(r => r.reservationId === reservation.reservationId);
    if (index !== -1) {
      allReservations[index].status = reservation.status;
  
      // If status changes to 'CHECKED-OUT', move the reservation to checked-out storage
      if (reservation.status === 'CHECKED-OUT') {
        const [checkedOutReservation] = allReservations.splice(index, 1);
        this.saveReservations(allReservations); // Update current reservations in local storage
        this.addCheckedOutReservation(checkedOutReservation); // Add to checked-out reservations
      } else {
        this.saveReservations(allReservations); // Simply update the reservation status
      }
    }
  }
  
  

  addCheckedOutReservation(reservation: IReservation): void {
    const checkedOutReservations = this.getCheckedOutReservations();
    checkedOutReservations.push(reservation);
    localStorage.setItem('checkedOutReservations', JSON.stringify(checkedOutReservations));
  }

  getCheckedOutReservations(): IReservation[] {
    const checkedOutReservations = localStorage.getItem('checkedOutReservations');
    return checkedOutReservations ? JSON.parse(checkedOutReservations) : [];
  }
  

  cancelReservation(reservationId: number): void {
    const allReservations = this.getReservations();
    const index = allReservations.findIndex(r => r.reservationId === reservationId);
    if (index !== -1) {
      // Remove from current reservations
      const [cancelledReservation] = allReservations.splice(index, 1);
      this.saveReservations(allReservations); // Save updated reservations list

      // Add to cancelled reservations
      this.addCancelledReservation(cancelledReservation);
    }
  }


  addCancelledReservation(reservation: IReservation): void {
    const cancelledReservations = this.getCancelledReservations();
    cancelledReservations.push(reservation);
    localStorage.setItem('cancelledReservations', JSON.stringify(cancelledReservations));
  }

  
  
  // Method to get cancelled reservations from local storage
  getCancelledReservations(): IReservation[] {
    const cancelledReservations = localStorage.getItem('cancelledReservations');
    return cancelledReservations ? JSON.parse(cancelledReservations) : [];
  }
  
  saveReservations(reservations: IReservation[]): void {
  localStorage.setItem('reservations', JSON.stringify(reservations));
  }



  clearReservationById(reservationId: number) : void {
    const reservations=this.getReservations();
    const currentReservations= reservations.filter(r => 
      r.reservationId !== reservationId
    );

    localStorage.setItem(this.storageKey,JSON.stringify(currentReservations));
  }

  getReservationById(reservation: IReservation): void{
    const reservations=this.getReservations();
    const currentReservation= reservations.find(r => 
      r.reservationId === reservation.reservationId
    )
    console.log(currentReservation);
  }

  getReservations(): IReservation[] {
    const reservations = localStorage.getItem(this.storageKey);
    return reservations ? JSON.parse(reservations) : [];
  }

  clearReservations(): void {
    localStorage.removeItem(this.storageKey);
  }

  calculateTotalReservationsByMonth(): { [key: string]: number } {
    // Fetch all reservations from their respective storages
    const activeReservations = this.getReservations(); // Confirmed, Checked-In, others still active
    const cancelledReservations = this.getCancelledReservations();
    const checkedOutReservations = this.getCheckedOutReservations();
    
    const totalReservations: { [key: string]: number } = {};
  
    // Combine reservations from all sources
    const allReservations = [
      ...activeReservations,
      ...cancelledReservations,
      ...checkedOutReservations
    ];
  
    // Calculate reservations per month
    allReservations.forEach(reservation => {
      const monthYear = this.getMonthYear(reservation.arrivalDate);
      totalReservations[monthYear] = (totalReservations[monthYear] || 0) + 1;
    });
  
    return totalReservations;
  }
  

  calculateCancelledReservationsByMonth(): { [key: string]: number } {
    const reservations = this.getCancelledReservations();
    const cancelledByMonth: { [key: string]: number } = {};

    reservations.forEach(reservation => {
      const monthYear = this.getMonthYear(reservation.arrivalDate);
      cancelledByMonth[monthYear] = (cancelledByMonth[monthYear] || 0) + 1;
    });

    return cancelledByMonth;
  }


  // Calculate confirmed reservations per month based on arrivalDate
  calculateConfirmedReservationsByMonth(): { [key: string]: number } {
    const reservations = this.getReservations();
    const confirmedByMonth: { [key: string]: number } = {};

    reservations.forEach(reservation => {
      if (reservation.status === 'CONFIRM') {
        const monthYear = this.getMonthYear(reservation.arrivalDate);
        confirmedByMonth[monthYear] = (confirmedByMonth[monthYear] || 0) + 1;
      }
    });

    return confirmedByMonth;
  }

  // Calculate checked-in reservations per month based on arrivalDate
  calculateCheckedInReservationsByMonth(): { [key: string]: number } {
    const reservations = this.getReservations();
    const checkedInByMonth: { [key: string]: number } = {};

    reservations.forEach(reservation => {
      if (reservation.status === 'CHECKED-IN') {
        const monthYear = this.getMonthYear(reservation.arrivalDate);
        checkedInByMonth[monthYear] = (checkedInByMonth[monthYear] || 0) + 1;
      }
    });

    return checkedInByMonth;
  }

  // Calculate checked-out reservations per month based on arrivalDate
  calculateCheckedOutReservationsByMonth(): { [key: string]: number } {
    // Fetch checked-out reservations from their dedicated storage
    const reservations = this.getCheckedOutReservations();
    const checkedOutByMonth: { [key: string]: number } = {};
  
    reservations.forEach(reservation => {
      const monthYear = this.getMonthYear(reservation.arrivalDate);
      checkedOutByMonth[monthYear] = (checkedOutByMonth[monthYear] || 0) + 1;
    });
  
    return checkedOutByMonth;
  }
  

  // Utility function to extract month and year from arrivalDate
  private getMonthYear(date: Date): string {
    const dateObj = new Date(date);
    const month = dateObj.toLocaleString('default', { month: 'long' }); // Full month name
    const year = dateObj.getFullYear();
    return `${month} ${year}`;
  }

  // Add this method to your ReservationService
getMonthlyReservations(): { month: number, reservations: number }[] {
  const reservations = this.getReservations();
  const reservationsByMonth = Array(12).fill(0); // Array to store reservations for each month

  reservations.forEach((reservation) => {
    const arrivalDate = new Date(reservation.arrivalDate);
    const month = arrivalDate.getMonth(); // getMonth() returns 0 for January, 11 for December
    reservationsByMonth[month] += 1;
  });

  return reservationsByMonth.map((count, index) => ({
    month: index + 1,  // months start from 1 for January, 2 for February, etc.
    reservations: count,
  }));
}



}