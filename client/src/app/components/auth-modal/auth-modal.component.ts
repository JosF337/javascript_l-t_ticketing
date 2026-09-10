import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title">{{ isRegister ? 'Create Helpdesk Account' : 'Sign In to Helpdesk' }}</h3>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <!-- Tab Switcher -->
        <div class="tab-bar">
          <button [class.active]="!isRegister" (click)="isRegister = false" class="tab-btn">Sign In</button>
          <button [class.active]="isRegister" (click)="isRegister = true" class="tab-btn">Register New Account</button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <!-- Registration Fields -->
          <div *ngIf="isRegister" class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" [(ngModel)]="name" name="name" required class="form-input" placeholder="e.g. John Doe" />
          </div>

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" [(ngModel)]="email" name="email" required class="form-input" placeholder="user@helpdesk.com" />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" [(ngModel)]="password" name="password" required class="form-input" placeholder="••••••••" />
          </div>

          <div *ngIf="isRegister" class="form-group">
            <label class="form-label">Role</label>
            <select [(ngModel)]="role" name="role" class="form-select">
              <option value="customer">Customer</option>
              <option value="agent">Support Agent</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <button type="submit" [disabled]="loading" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            {{ loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In') }}
          </button>
        </form>

        <!-- Quick Demo Switcher -->
        <div class="demo-section">
          <div class="demo-title">Or Fast Sign-In as Seeded Account:</div>
          <div class="demo-grid">
            <button 
              *ngFor="let p of auth.personas" 
              (click)="fastLogin(p.email)" 
              class="btn btn-secondary btn-sm"
            >
              {{ p.label }} ({{ p.badge }})
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
    }
    .close-btn:hover { color: var(--text-primary); }

    .tab-bar {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border-radius: var(--radius-md);
      padding: 0.25rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--border-subtle);
    }
    .tab-btn {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      background: transparent;
      border: none;
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

    .demo-section {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);
    }
    .demo-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
  `]
})
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();

  isRegister = false;
  email = '';
  password = 'Password@123';
  name = '';
  role = 'customer';
  loading = false;

  constructor(public auth: AuthService) {}

  async onSubmit() {
    this.loading = true;
    let success = false;
    if (this.isRegister) {
      success = await this.auth.register({
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role
      });
    } else {
      success = await this.auth.login(this.email, this.password);
    }
    this.loading = false;
    if (success) {
      this.close.emit();
    }
  }

  async fastLogin(email: string) {
    this.loading = true;
    const success = await this.auth.loginAsPersona(email);
    this.loading = false;
    if (success) {
      this.close.emit();
    }
  }
}
