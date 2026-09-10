import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrapper">
      <div 
        *ngFor="let toast of (toastService.toasts$ | async)" 
        class="toast"
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-body">
          <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button (click)="toastService.remove(toast.id)" class="toast-close">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-body {
      flex: 1;
    }
    .toast-title {
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 0.15rem;
    }
    .toast-message {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .toast-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 0.25rem;
    }
    .toast-close:hover {
      color: var(--text-primary);
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
