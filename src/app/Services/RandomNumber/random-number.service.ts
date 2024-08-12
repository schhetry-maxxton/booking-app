import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RandomNumberService {

  randomNumber: number | null = null;
  
  constructor() { }

  generateRandomNumber(): void {
    this.randomNumber = Math.floor(Math.random() * 900000 + 100000);
  }
}
