export interface IRoom {
    stayDateFrom: string | number | Date;
    stayDateTo: string | number | Date;
    roomId : number,
    locationId : number,
    locationName : string,
    roomName : string,
    pricePerDayPerPerson : number,
    guestCapacity : number,
    imageFileName: string,
}
