export interface IReservation {
    reservationId : number,
    locationId: number,
    roomId : number,
    customerId : number,
    arrivalDate: Date     // "YYYY-MM-DD",
    departureDate: Date     // "YYYY-MM-DD",
    reservationDate: Date     // "YYYY-MM-DD HH:MM:SS",
    totalPrice: number,
    status: 'CONFIRM' | 'CHECKED-IN' | 'CHECKED-OUT',
    paidAmount : number,
    numberOfGuest : number,
}
