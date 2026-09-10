import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket } from '../../models/types';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customer-dashboard">
      <!-- Hero Welcome Banner -->
      <div class="glass-panel hero-banner">
        <div class="hero-content">
          <div class="badge badge-open hero-pill">Customer Support Portal</div>
          <h1 class="hero-title">Welcome, {{ auth.currentUser?.name }}</h1>
          <p class="hero-subtitle">Track your support requests with real-time SLA countdowns and direct engineer messaging.</p>
          <div class="hero-actions">
            <button (click)="openNewTicket.emit()" class="btn btn-primary">
              <span style="font-size: 1.1rem; font-weight: 700;">+</span> Create New Support Ticket
            </button>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Bar -->
      <div class="filter-bar glass-panel">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search tickets by subject, category, or ID..." 
            class="search-input"
          />
        </div>

        <div class="status-filters">
          <button 
            *ngFor="let s of statusOptions" 
            (click)="selectedStatus = s" 
            class="filter-pill"
            [class.active]="selectedStatus === s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Tickets Grid -->
      <div *ngIf="loading" class="loading-box">
        <div class="spinner"></div>
        <span>Fetching your tickets...</span>
      </div>

      <div *ngIf="!loading && filteredTickets().length === 0" class="empty-state glass-panel">
        <div class="empty-icon">📂</div>
        <h3>No Tickets Found</h3>
        <p>You have no active support requests matching the selected filter.</p>
        <button (click)="openNewTicket.emit()" class="btn btn-primary" style="margin-top: 1rem;">
          Create Your First Ticket
        </button>
      </div>

      <div *ngIf="!loading && filteredTickets().length > 0" class="grid-cards">
        <div 
          *ngFor="let t of filteredTickets()" 
          (click)="selectTicket.emit(t)" 
          class="card ticket-card"
        >
          <div class="card-header">
            <span class="category-badge">{{ t.category }}</span>
            <div class="card-badges">
              <span class="badge" [ngClass]="'badge-' + t.priority.toLowerCase()">{{ t.priority }}</span>
              <span class="badge" [ngClass]="'badge-' + t.status.toLowerCase().replace(' ', '-')">{{ t.status }}</span>
            </div>
          </div>

          <h3 class="card-title">{{ t.title }}</h3>
          <p class="card-desc">{{ t.description }}</p>

          <div class="card-footer">
            <div class="sla-timer" [class.sla-warning]="isSlaBreached(t)">
              <span>⏱️ {{ getSlaLabel(t) }}</span>
            </div>
            <span *ngIf="t.isEscalated" class="badge badge-urgent badge-sm">ESCALATED</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-banner {
      padding: 2.25rem 2rem;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(99, 102, 241, 0.15) 100%);
      border-color: rgba(99, 102, 241, 0.3);
      position: relative;
      overflow: hidden;
    }

    .hero-pill { margin-bottom: 0.75rem; }
    .hero-title { font-size: 1.85rem; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
    .hero-subtitle { color: var(--text-secondary); max-width: 600px; margin: 0.5rem 0 1.25rem 0; font-size: 0.95rem; }
    .hero-actions { display: flex; gap: 0.75rem; }

    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      flex: 1;
      min-width: 250px;
    }

    .search-input {
      background: none;
      border: none;
      color: var(--text-primary);
      width: 100%;
      font-size: 0.875rem;
      outline: none;
    }

    .status-filters {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 0.4rem 0.75rem;
      font-size: 0.775rem;
      font-weight: 600;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-pill:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); }
    .filter-pill.active {
      background: var(--indigo);
      color: #ffffff;
      border-color: var(--indigo);
      box-shadow: 0 2px 8px var(--indigo-glow);
    }

    .ticket-card {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 180px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .category-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-badges {
      display: flex;
      gap: 0.35rem;
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.4rem;
      line-height: 1.4;
    }

    .card-desc {
      font-size: 0.825rem;
      color: var(--text-secondary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.75rem;
    }

    .sla-timer {
      color: var(--text-muted);
      font-weight: 600;
    }

    .sla-timer.sla-warning {
      color: var(--rose);
      font-weight: 800;
    }

    .loading-box {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--indigo);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 3.5rem 2rem;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  @Output() selectTicket = new EventEmitter<Ticket>();
  @Output() openNewTicket = new EventEmitter<void>();

  tickets: Ticket[] = [];
  loading = true;
  searchQuery = '';
  selectedStatus = 'All';
  statusOptions = ['All', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadTickets();
  }

  async loadTickets() {
    this.loading = true;
    try {
      const res = await this.api.tickets.list();
      if (res.success) {
        this.tickets = res.data;
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to load tickets');
    } finally {
      this.loading = false;
    }
  }

  filteredTickets(): Ticket[] {
    return this.tickets.filter(t => {
      const matchesStatus = this.selectedStatus === 'All' || t.status === this.selectedStatus;
      const q = this.searchQuery.toLowerCase();
      const matchesSearch = !q || 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t._id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }

  isSlaBreached(t: Ticket): boolean {
    if (t.status === 'Resolved' || t.status === 'Closed') return false;
    if (!t.slaDueAt) return false;
    return new Date(t.slaDueAt).getTime() < Date.now();
  }

  getSlaLabel(t: Ticket): string {
    if (t.status === 'Resolved' || t.status === 'Closed') return `Status: ${t.status}`;
    if (!t.slaDueAt) return 'No SLA Target';
    const diffMs = new Date(t.slaDueAt).getTime() - Date.now();
    if (diffMs < 0) return 'SLA Target Breached';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours}h ${mins}m remaining`;
  }
}
