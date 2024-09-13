import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-reservation',
  templateUrl: './new-reservation.component.html',
  styleUrl: './new-reservation.component.css'
})
export class NewReservationComponent implements OnInit {
  filterForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NewReservationComponent>
  ) {
    this.filterForm = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
      numberOfPersons: ['']
    });
  }

  ngOnInit(): void {
   
  }

  applyFilters(): void {
    if (this.filterForm.valid) {
      // Pass the filter form data back to the parent
      this.dialogRef.close(this.filterForm.value);
    }
  }
}
