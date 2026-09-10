import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket, SlaRule, SlaComplianceReport, AgentWorkloadReport, CategoryBreakdownReport } from '../../models/types';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="manager-dashboard">
      <!-- BI Executive Metrics -->
      <div class="metrics-grid">
        <div class="glass-panel metric-card">
          <div class="metric-label">SLA Compliance Rate</div>
          <div class="metric-value color-emerald">{{ slaReport?.compliancePercentage || 0 }}%</div>
          <div class="metric-sub">Met: {{ slaReport?.metSla || 0 }} | Breached: {{ slaReport?.breachedSla || 0 }}</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">Total Tickets Processed</div>
          <div class="metric-value color-indigo">{{ slaReport?.totalResolvedOrClosed || 0 }}</div>
          <div class="metric-sub">Resolved or Closed lifecycle</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">Active Workload</div>
          <div class="metric-value color-cyan">{{ getActiveTicketsCount() }}</div>
          <div class="metric-sub">Open / In Progress / On Hold</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-label">Active Support Agents</div>
          <div class="metric-value color-violet">{{ agentWorkloads.length }}</div>
          <div class="metric-sub">Workload balanced via Engine</div>
        </div>
      </div>

      <!-- Navigation Tabs: BI Analytics vs SLA Matrix CRUD vs Master Ticket Explorer -->
      <div class="glass-panel nav-tabs">
        <button [class.active]="currentTab === 'overview'" (click)="currentTab = 'overview'" class="tab-btn">
          📊 BI Reports & Workload
        </button>
        <button [class.active]="currentTab === 'sla'" (click)="currentTab = 'sla'" class="tab-btn">
          ⚙️ SLA Matrix Rules (Module 10)
        </button>
        <button [class.active]="currentTab === 'tickets'" (click)="currentTab = 'tickets'" class="tab-btn">
          📋 Master Ticket Explorer ({{ allTickets.length }})
        </button>
      </div>

      <!-- TAB 1: BI Overview -->
      <div *ngIf="currentTab === 'overview'" class="tab-content">
        <div class="grid-2-col">
          <!-- Agent Workload Distribution -->
          <div class="glass-panel section-card">
            <h3 class="section-title">Support Agent Workload Distribution</h3>
            <div *ngIf="agentWorkloads.length === 0" class="empty-text">No active agents reporting.</div>
            <div class="workload-list">
              <div *ngFor="let a of agentWorkloads" class="workload-item">
                <div class="workload-info">
                  <span class="w-avatar">{{ a.agentName.charAt(0) }}</span>
                  <div class="w-meta">
                    <strong>{{ a.agentName }}</strong>
                    <span class="w-sub">Agent ID: {{ a.agentId.substring(0, 8) }}...</span>
                  </div>
                </div>
                <div class="w-badge">
                  <span class="badge badge-in-progress">{{ a.activeTickets }} Active Tickets</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="glass-panel section-card">
            <h3 class="section-title">Ticket Volume by Category</h3>
            <div class="category-bars">
              <div *ngFor="let c of categoryBreakdowns" class="cat-bar-item">
                <div class="cat-label">
                  <span>{{ c._id }}</span>
                  <strong>{{ c.count }} tickets</strong>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="getCategoryPercent(c.count)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: SLA Matrix CRUD (Module 10) -->
      <div *ngIf="currentTab === 'sla'" class="tab-content">
        <div class="glass-panel section-card">
          <div class="sla-header">
            <div>
              <h3 class="section-title">SLA Matrix Rules Management</h3>
              <p class="section-subtitle">Define target resolution thresholds per Category and Priority combination.</p>
            </div>
            <button (click)="openRuleModal = true" class="btn btn-primary btn-sm">+ Add SLA Rule</button>
          </div>

          <!-- SLA Table -->
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Resolution Target</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of slaRules">
                  <td><span class="badge badge-secondary">{{ r.category }}</span></td>
                  <td><span class="badge" [ngClass]="'badge-' + r.priority.toLowerCase()">{{ r.priority }}</span></td>
                  <td><strong>{{ r.resolutionHours }} Hours</strong></td>
                  <td>
                    <button (click)="deleteRule(r._id)" class="btn btn-danger btn-sm" title="Delete Rule">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: Master Ticket Explorer -->
      <div *ngIf="currentTab === 'tickets'" class="tab-content">
        <div class="glass-panel section-card">
          <h3 class="section-title">All System Support Tickets</h3>
          <div class="grid-cards">
            <div 
              *ngFor="let t of allTickets" 
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
                <span>{{ getCustomerName(t) }}</span>
                <span>{{ getAgentName(t) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SLA Rule Modal -->
      <div *ngIf="openRuleModal" class="modal-overlay" (click)="openRuleModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Create SLA Rule</h3>
          <form (ngSubmit)="saveRule()">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select [(ngModel)]="newRuleCategory" name="newCat" class="form-select">
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Network">Network</option>
                <option value="Billing">Billing</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select [(ngModel)]="newRulePriority" name="newPri" class="form-select">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Resolution Hours Threshold</label>
              <input type="number" [(ngModel)]="newRuleHours" name="newHours" min="1" required class="form-input" />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" (click)="openRuleModal = false" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save SLA Rule</button>
            </div>
          </form>
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
    }

    .metric-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
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

    .color-emerald { color: var(--emerald); }
    .color-indigo { color: var(--indigo); }
    .color-cyan { color: var(--cyan); }
    .color-violet { color: var(--violet); }

    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .tab-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: var(--font-main);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      background: var(--indigo);
      color: #ffffff;
      box-shadow: 0 2px 8px var(--indigo-glow);
    }

    .grid-2-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .section-card {
      padding: 1.5rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .section-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }

    .workload-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .workload-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .workload-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .w-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--indigo);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .w-meta {
      display: flex;
      flex-direction: column;
    }

    .w-sub {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .category-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .cat-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .cat-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .bar-track {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--indigo) 0%, var(--cyan) 100%);
      border-radius: var(--radius-full);
    }

    .sla-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th, .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-subtle);
    }

    .data-table th {
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
    }

    .ticket-card {
      cursor: pointer;
    }

    .empty-text {
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: 1rem 0;
    }
  `]
})
export class ManagerDashboardComponent implements OnInit {
  @Output() selectTicket = new EventEmitter<Ticket>();

  currentTab: 'overview' | 'sla' | 'tickets' = 'overview';
  slaReport: SlaComplianceReport | null = null;
  agentWorkloads: AgentWorkloadReport[] = [];
  categoryBreakdowns: CategoryBreakdownReport[] = [];
  slaRules: SlaRule[] = [];
  allTickets: Ticket[] = [];

  openRuleModal = false;
  newRuleCategory = 'Software';
  newRulePriority = 'High';
  newRuleHours = 12;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAllData();
  }

  async loadAllData() {
    try {
      const [slaRes, workRes, catRes, rulesRes, ticketsRes] = await Promise.all([
        this.api.reports.getSlaCompliance().catch(() => ({ success: false, data: null })),
        this.api.reports.getAgentWorkload().catch(() => ({ success: false, data: [] })),
        this.api.reports.getCategoryBreakdown().catch(() => ({ success: false, data: [] })),
        this.api.sla.list().catch(() => ({ success: false, data: [] })),
        this.api.tickets.list().catch(() => ({ success: false, data: [] }))
      ]);

      if (slaRes.success && slaRes.data) this.slaReport = slaRes.data;
      if (workRes.success && workRes.data) this.agentWorkloads = workRes.data;
      if (catRes.success && catRes.data) this.categoryBreakdowns = catRes.data;
      if (rulesRes.success && rulesRes.data) this.slaRules = rulesRes.data;
      if (ticketsRes.success && ticketsRes.data) this.allTickets = ticketsRes.data;
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to load manager metrics');
    }
  }

  getActiveTicketsCount(): number {
    return this.allTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  }

  getCategoryPercent(count: number): number {
    const total = this.categoryBreakdowns.reduce((sum, c) => sum + c.count, 0) || 1;
    return Math.round((count / total) * 100);
  }

  getCustomerName(t: Ticket): string {
    if (typeof t.customerId === 'object' && t.customerId) return t.customerId.name;
    return 'Customer';
  }

  getAgentName(t: Ticket): string {
    if (typeof t.assignedAgentId === 'object' && t.assignedAgentId) return t.assignedAgentId.name;
    return 'Unassigned';
  }

  async saveRule() {
    try {
      const res = await this.api.sla.create({
        category: this.newRuleCategory,
        priority: this.newRulePriority,
        resolutionHours: Number(this.newRuleHours)
      });
      if (res.success) {
        this.toast.success('SLA Rule created successfully');
        this.openRuleModal = false;
        const rulesRes = await this.api.sla.list();
        if (rulesRes.success) this.slaRules = rulesRes.data;
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to create SLA Rule');
    }
  }

  async deleteRule(id: string) {
    if (confirm('Are you sure you want to delete this SLA matrix rule?')) {
      try {
        const res = await this.api.sla.delete(id);
        if (res.success) {
          this.toast.success('SLA rule removed');
          this.slaRules = this.slaRules.filter(r => r._id !== id);
        }
      } catch (err: any) {
        this.toast.error(err.message || 'Failed to delete rule');
      }
    }
  }
}
