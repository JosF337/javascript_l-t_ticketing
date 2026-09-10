import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket } from '../../models/types';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="agent-dashboard">
      <!-- Top Metrics Overview -->
      <div class="metrics-grid">
        <div class="glass-panel metric-card">
          <div class="metric-label">My Active Caseload</div>
          <div class="metric-value color-indigo">{{ getMyActiveCount() }}</div>
          <div class="metric-sub">Assigned to you</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">Unassigned Pool</div>
          <div class="metric-value color-cyan">{{ getUnassignedCount() }}</div>
          <div class="metric-sub">Awaiting dispatch</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">SLA Breached / At Risk</div>
          <div class="metric-value color-rose">{{ getBreachedCount() }}</div>
          <div class="metric-sub">Urgent action required</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">Resolved / Closed</div>
          <div class="metric-value color-emerald">{{ getResolvedCount() }}</div>
          <div class="metric-sub">Completed lifecycle</div>
        </div>
      </div>

      <!-- Action Toolbar & Tabs -->
      <div class="glass-panel toolbar">
        <div class="tabs-group">
          <button [class.active]="activeTab === 'mine'" (click)="activeTab = 'mine'" class="tab-btn">
            My Queue ({{ getMyTickets().length }})
          </button>
          <button [class.active]="activeTab === 'unassigned'" (click)="activeTab = 'unassigned'" class="tab-btn">
            Unassigned Queue ({{ getUnassignedTickets().length }})
          </button>
          <button [class.active]="activeTab === 'all'" (click)="activeTab = 'all'" class="tab-btn">
            All Tickets ({{ tickets.length }})
          </button>
        </div>

        <div class="toolbar-actions">
          <button (click)="runBreachScan()" [disabled]="scanning" class="btn btn-secondary btn-sm">
            <span *ngIf="!scanning">⏰ Run SLA Breach Scanner</span>
            <span *ngIf="scanning">Scanning...</span>
          </button>
        </div>
      </div>

      <!-- Tickets Grid -->
      <div *ngIf="loading" class="loading-box">
        <div class="spinner"></div>
        <span>Loading ticket queue...</span>
      </div>

      <div *ngIf="!loading && displayedTickets().length === 0" class="empty-state glass-panel">
        <div class="empty-icon">✅</div>
        <h3>No Tickets in this Queue</h3>
        <p>All clear! Switch tabs or scan the unassigned queue for new tickets.</p>
      </div>

      <div *ngIf="!loading && displayedTickets().length > 0" class="grid-cards">
        <div 
          *ngFor="let t of displayedTickets()" 
          class="card ticket-card"
          (click)="selectTicket.emit(t)"
        >
          <div class="card-header">
            <span class="category-badge">{{ t.category }}</span>
            <div class="card-badges">
              <span class="badge" [ngClass]="'badge-' + t.priority.toLowerCase()">{{ t.priority }}</span>
              <span class="badge" [ngClass]="'badge-' + t.status.toLowerCase().replace(' ', '-')">{{ t.status }}</span>
              <span *ngIf="isSlaBreached(t)" class="badge badge-breached">BREACHED</span>
            </div>
          </div>

          <h3 class="card-title">{{ t.title }}</h3>
          <p class="card-desc">{{ t.description }}</p>

          <!-- Quick State Action Buttons -->
          <div class="card-actions" (click)="$event.stopPropagation()">
            <button 
              *ngIf="!t.assignedAgentId" 
              (click)="claimTicket(t)" 
              class="btn btn-primary btn-sm"
            >
              Claim Ticket
            </button>

            <button 
              *ngIf="t.status === 'Open' && isAssignedToMe(t)" 
              (click)="updateStatus(t, 'In Progress')" 
              class="btn btn-primary btn-sm"
            >
              Start Work
            </button>

            <button 
              *ngIf="t.status === 'In Progress' && isAssignedToMe(t)" 
              (click)="updateStatus(t, 'Resolved')" 
              class="btn btn-success btn-sm"
            >
              Resolve
            </button>
          </div>

          <div class="card-footer">
            <span class="agent-tag">👤 {{ getAssignedLabel(t) }}</span>
            <span class="sla-due">{{ formatSlaDue(t) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      padding: 1.25rem;
      text-align: left;
    }

    .metric-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 0.25rem 0;
    }

    .metric-sub {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .color-indigo { color: var(--indigo); }
    .color-cyan { color: var(--cyan); }
    .color-rose { color: var(--rose); }
    .color-emerald { color: var(--emerald); }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .tabs-group {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .tab-btn {
      padding: 0.45rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      font-family: var(--font-main);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: var(--indigo);
      color: #ffffff;
      box-shadow: 0 2px 8px var(--indigo-glow);
    }

    .ticket-card {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 200px;
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

    .card-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .loading-box, .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--indigo);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AgentDashboardComponent implements OnInit {
  @Output() selectTicket = new EventEmitter<Ticket>();

  tickets: Ticket[] = [];
  loading = true;
  scanning = false;
  activeTab: 'mine' | 'unassigned' | 'all' = 'mine';

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

  getMyTickets(): Ticket[] {
    const myId = this.auth.currentUser?._id;
    return this.tickets.filter(t => {
      const agentId = typeof t.assignedAgentId === 'object' && t.assignedAgentId ? t.assignedAgentId._id : t.assignedAgentId;
      return agentId === myId;
    });
  }

  getUnassignedTickets(): Ticket[] {
    return this.tickets.filter(t => !t.assignedAgentId);
  }

  displayedTickets(): Ticket[] {
    if (this.activeTab === 'mine') return this.getMyTickets();
    if (this.activeTab === 'unassigned') return this.getUnassignedTickets();
    return this.tickets;
  }

  getMyActiveCount(): number {
    return this.getMyTickets().filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  }

  getUnassignedCount(): number {
    return this.getUnassignedTickets().length;
  }

  getBreachedCount(): number {
    return this.tickets.filter(t => this.isSlaBreached(t)).length;
  }

  getResolvedCount(): number {
    return this.tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  }

  isSlaBreached(t: Ticket): boolean {
    if (t.status === 'Resolved' || t.status === 'Closed') return false;
    if (!t.slaDueAt) return false;
    return new Date(t.slaDueAt).getTime() < Date.now();
  }

  isAssignedToMe(t: Ticket): boolean {
    const myId = this.auth.currentUser?._id;
    const agentId = typeof t.assignedAgentId === 'object' && t.assignedAgentId ? t.assignedAgentId._id : t.assignedAgentId;
    return agentId === myId;
  }

  getAssignedLabel(t: Ticket): string {
    if (typeof t.assignedAgentId === 'object' && t.assignedAgentId) {
      return t.assignedAgentId.name;
    }
    return 'Unassigned';
  }

  formatSlaDue(t: Ticket): string {
    if (!t.slaDueAt) return '';
    return new Date(t.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async claimTicket(t: Ticket) {
    const myId = this.auth.currentUser?._id;
    if (!myId) return;
    try {
      const res = await this.api.tickets.assign(t._id, myId);
      if (res.success) {
        this.toast.success(`Ticket claimed and assigned to you`);
        this.loadTickets();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to claim ticket');
    }
  }

  async updateStatus(t: Ticket, newStatus: string) {
    try {
      const res = await this.api.tickets.updateStatus(t._id, newStatus);
      if (res.success) {
        this.toast.success(`Ticket updated to ${newStatus}`);
        this.loadTickets();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Status transition error');
    }
  }

  async runBreachScan() {
    this.scanning = true;
    try {
      const res = await this.api.tickets.checkBreaches();
      if (res.success) {
        this.toast.info(`Active Scanner: ${res.breachedCount} tickets marked breached`);
        this.loadTickets();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Breach scan error');
    } finally {
      this.scanning = false;
    }
  }
}
