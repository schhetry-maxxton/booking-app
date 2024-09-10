interface IRoomFilter {
    locationId?: number;
    stayDateFrom?: Date; // (YYYY-MM-DD)
    stayDateTo?: Date; // (YYYY-MM-DD)
    numberOfGuests?: number;
    pricePerDay?: number;
    minStay?: number;
    maxStay?: number;
  }