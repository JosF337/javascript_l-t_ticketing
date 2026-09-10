import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-new-ticket-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Create Support Ticket</h3>
            <p class="modal-subtitle">Submit a request to our engineering and support dispatchers</p>
          </div>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <!-- Title -->
          <div class="form-group">
            <label class="form-label">Subject / Issue Summary</label>
            <input 
              type="text" 
              [(ngModel)]="title" 
              name="title" 
              required 
              class="form-input" 
              placeholder="e.g. Cannot connect to staging VPN server" 
            />
          </div>

          <!-- Category & Priority -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Category</label>
              <select [(ngModel)]="category" name="category" class="form-select">
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Network">Network</option>
                <option value="Billing">Billing</option>
              </select>
            </div>

            <div class="form-group flex-1">
              <label class="form-label">Priority</label>
              <select [(ngModel)]="priority" name="priority" class="form-select">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <!-- Dynamic SLA Predictor Card -->
          <div class="sla-predictor">
            <div class="sla-header">
              <span class="sla-icon">⚡</span>
              <span class="sla-title">Estimated SLA Resolution Target</span>
            </div>
            <div class="sla-value">
              {{ getEstimatedSlaHours() }} Hours Guaranteed Resolution
            </div>
            <div class="sla-note">
              Calculated dynamically via Module 5 SLA Engine matrix.
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label">Detailed Description</label>
            <textarea 
              [(ngModel)]="description" 
              name="description" 
              required 
              class="form-textarea" 
              placeholder="Please describe the issue, error codes, and steps to reproduce..."
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button type="button" (click)="close.emit()" class="btn btn-secondary">Cancel</button>
            <button type="submit" [disabled]="loading" class="btn btn-primary">
              {{ loading ? 'Creating Ticket...' : 'Submit Support Ticket' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
    }
    .close-btn:hover { color: var(--text-primary); }

    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 { flex: 1; }

    .sla-predictor {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .sla-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--indigo);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sla-value {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0.25rem 0;
    }
    .sla-note {
      font-size: 0.725rem;
      color: var(--text-secondary);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class NewTicketModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  title = '';
  category = 'Software';
  priority = 'Medium';
  description = '';
  loading = false;

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  getEstimatedSlaHours(): number {
    const matrix: Record<string, Record<string, number>> = {
      Software: { Urgent: 4, High: 12, Medium: 24, Low: 48 },
      Hardware: { Urgent: 6, High: 24, Medium: 48, Low: 72 },
      Network:  { Urgent: 4, High: 8,  Medium: 16, Low: 24 },
      Billing:  { Urgent: 8, High: 24, Medium: 48, Low: 72 }
    };
    return matrix[this.category]?.[this.priority] || 24;
  }

  async onSubmit() {
    if (!this.title.trim() || !this.description.trim()) {
      this.toast.warning('Please complete all required ticket fields');
      return;
    }

    this.loading = true;
    try {
      const res = await this.api.tickets.create({
        title: this.title,
        category: this.category,
        priority: this.priority,
        description: this.description
      });

      if (res.success) {
        this.toast.success('Ticket submitted successfully!');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        this.created.emit();
        this.close.emit();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to create ticket');
    } finally {
      this.loading = false;
    }
  }
}
