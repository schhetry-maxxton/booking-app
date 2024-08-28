import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {

  @Input() arrivalDate: Date | null = null;
  @Input() departureDate: Date | null = null;
  @Input() roomId: number | null = null;
  bookingForm: FormGroup;
  modalRef: any;

  constructor(private fb: FormBuilder) {
    this.bookingForm = this.fb.group({
      arrivalDate: [{ value: '', disabled: true }],
      departureDate: [{ value: '', disabled: true }],
      roomId: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    if (this.arrivalDate && this.departureDate && this.roomId !== null) {
      this.bookingForm.patchValue({
        arrivalDate: this.arrivalDate.toDateString(),
        departureDate: this.departureDate.toDateString(),
        roomId: this.roomId
      });
    }
  }

  close(): void {
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  save(): void {
    // Logic to save booking details
  }
}
