export interface IRoomAvailability {
    // [x: string]: any
    roomId : number,
    stayDateFrom : Date    //"YYYY-MM-DD",
    stayDateTo: Date    //"YYYY-MM-DD",
    arrivalDays: string[],
    departureDays: string[],
    minStay: number,
    maxStay: number,
}
