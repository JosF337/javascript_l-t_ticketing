import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';
import { ToastService } from './services/toast.service';
import { Ticket } from './models/types';
import { Subscription } from 'rxjs';

import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { CustomerDashboardComponent } from './components/customer-dashboard/customer-dashboard.component';
import { AgentDashboardComponent } from './components/agent-dashboard/agent-dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard/manager-dashboard.component';
import { NewTicketModalComponent } from './components/new-ticket-modal/new-ticket-modal.component';
import { TicketDetailModalComponent } from './components/ticket-detail-modal/ticket-detail-modal.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    ToastContainerComponent,
    CustomerDashboardComponent,
    AgentDashboardComponent,
    ManagerDashboardComponent,
    NewTicketModalComponent,
    TicketDetailModalComponent,
    AuthModalComponent
  ],
  template: `
    <div class="app-layout">
      <div class="container">
        <!-- Top Navigation -->
        <app-navbar (openAuth)="showAuthModal = true"></app-navbar>

        <!-- Main Content Area -->
        <main>
          <ng-container *ngIf="auth.currentUser as user; else loggedOutHero">
            <!-- Customer View -->
            <app-customer-dashboard
              *ngIf="user.role === 'customer'"
              (openNewTicket)="showNewTicketModal = true"
              (selectTicket)="onSelectTicket($event)"
              #customerDash
            ></app-customer-dashboard>

            <!-- Agent View -->
            <app-agent-dashboard
              *ngIf="user.role === 'agent'"
              (selectTicket)="onSelectTicket($event)"
              #agentDash
            ></app-agent-dashboard>

            <!-- Manager / Admin View -->
            <app-manager-dashboard
              *ngIf="user.role === 'manager' || user.role === 'admin'"
              (selectTicket)="onSelectTicket($event)"
              #managerDash
            ></app-manager-dashboard>
          </ng-container>

          <ng-template #loggedOutHero>
            <div class="glass-panel logged-out-card">
              <div class="hero-badge">Angular Enterprise Edition</div>
              <h2>Sign In to Access Customer Helpdesk</h2>
              <p>Please select a demo persona from the top navigation bar or log in with your account credentials.</p>
              <button (click)="showAuthModal = true" class="btn btn-primary" style="margin-top: 1rem;">
                Sign In / Register
              </button>
            </div>
          </ng-template>
        </main>
      </div>

      <!-- Modals -->
      <app-new-ticket-modal
        *ngIf="showNewTicketModal"
        (close)="showNewTicketModal = false"
        (created)="onTicketCreated()"
      ></app-new-ticket-modal>

      <app-ticket-detail-modal
        *ngIf="selectedTicket"
        [ticket]="selectedTicket"
        (close)="selectedTicket = null"
        (updated)="onTicketUpdated()"
      ></app-ticket-detail-modal>

      <app-auth-modal
        *ngIf="showAuthModal"
        (close)="showAuthModal = false"
      ></app-auth-modal>

      <!-- Reactive Toast Container -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      padding-bottom: 2rem;
    }

    .logged-out-card {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 600px;
      margin: 3rem auto;
    }

    .hero-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cyan);
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      margin-bottom: 1rem;
      text-transform: uppercase;
    }

    .logged-out-card h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }

    .logged-out-card p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  showNewTicketModal = false;
  showAuthModal = false;
  selectedTicket: Ticket | null = null;

  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private socket: SocketService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    // Listen to real-time events across the app
    this.subs.push(
      this.socket.ticketCreated$.subscribe((data) => {
        if (data) {
          this.toast.info(`New Ticket #${data.ticket?._id?.substring(0,6) || ''} created`, 'Real-time Alert');
        }
      }),
      this.socket.slaBreachAlert$.subscribe((data) => {
        if (data) {
          this.toast.warning(`SLA Breach Warning for ticket ${data.ticketId}`, 'SLA Alert');
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  onSelectTicket(ticket: Ticket) {
    this.selectedTicket = ticket;
  }

  onTicketCreated() {
    // Tickets updated
  }

  onTicketUpdated() {
    // Refreshed
  }
}
