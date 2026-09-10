import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="glass-panel navbar">
      <!-- Brand Logo -->
      <div class="nav-brand">
        <div class="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div>
          <div class="brand-title">
            Support<span class="gradient-text">X</span>
            <span class="version-tag">Angular v18</span>
          </div>
          <div class="brand-subtitle">Enterprise Helpdesk & Dynamic SLA Engine</div>
        </div>
      </div>

      <!-- Center: 1-Click Persona Quick Switcher -->
      <div class="persona-switcher">
        <div class="persona-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Quick Persona:
        </div>
        <div class="persona-chips">
          <button 
            *ngFor="let p of auth.personas" 
            (click)="auth.loginAsPersona(p.email)"
            [class.active]="auth.currentUser?.email === p.email"
            class="persona-btn"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Right: Real-time Socket status, Swagger Docs, User profile & Auth -->
      <div class="nav-actions">
        <!-- Live WebSocket Indicator -->
        <div 
          class="ws-badge" 
          [class.ws-connected]="(socket.connected$ | async)"
          [title]="(socket.connected$ | async) ? 'WebSocket Real-Time Connected' : 'WebSocket Disconnected'"
        >
          <span class="pulse-dot"></span>
          <span>{{ (socket.connected$ | async) ? 'Live WS' : 'Offline' }}</span>
        </div>

        <!-- Swagger Docs Link -->
        <a 
          href="/api/docs" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn btn-secondary btn-sm"
          style="text-decoration: none;"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          API Docs
        </a>

        <!-- Logged in state -->
        <ng-container *ngIf="auth.currentUser as user; else loggedOut">
          <div class="user-chip">
            <div class="avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
            <div class="user-meta">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-role badge" [ngClass]="'badge-' + user.role">{{ user.role }}</span>
            </div>
            <button (click)="auth.logout()" class="btn btn-secondary btn-icon btn-sm" title="Log Out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </ng-container>

        <ng-template #loggedOut>
          <button (click)="openAuth.emit()" class="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Sign In / Register
          </button>
        </ng-template>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: var(--radius-lg);
      gap: 1rem;
      flex-wrap: wrap;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--indigo) 0%, var(--cyan) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 12px var(--indigo-glow);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .gradient-text {
      background: linear-gradient(135deg, var(--cyan) 0%, var(--indigo) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .version-tag {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      background: rgba(99, 102, 241, 0.2);
      color: var(--indigo);
      border: 1px solid rgba(99, 102, 241, 0.4);
      font-weight: 700;
    }

    .brand-subtitle {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .persona-switcher {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
    }

    .persona-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .persona-chips {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .persona-btn {
      padding: 0.25rem 0.6rem;
      font-size: 0.725rem;
      font-weight: 600;
      font-family: var(--font-main);
      border-radius: var(--radius-full);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .persona-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .persona-btn.active {
      background: linear-gradient(135deg, var(--indigo) 0%, #4f46e5 100%);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px var(--indigo-glow);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ws-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-full);
      background: rgba(244, 63, 94, 0.15);
      color: var(--rose);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .ws-connected {
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--violet) 0%, var(--indigo) 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .user-name {
      font-size: 0.75rem;
      font-weight: 700;
    }

    .user-role {
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
    }
  `]
})
export class NavbarComponent {
  @Output() openAuth = new EventEmitter<void>();

  constructor(
    public auth: AuthService,
    public socket: SocketService
  ) {}
}
