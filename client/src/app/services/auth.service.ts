import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/types';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';

export interface Persona {
  label: string;
  email: string;
  role: 'customer' | 'agent' | 'manager' | 'admin';
  name: string;
  badge: string;
}

export const PERSONAS: Persona[] = [
  { label: 'Customer Charlie', email: 'customer1@helpdesk.com', role: 'customer', name: 'Customer Charlie Green', badge: 'Customer' },
  { label: 'Customer Diana', email: 'customer2@helpdesk.com', role: 'customer', name: 'Customer Diana Prince', badge: 'Customer' },
  { label: 'Agent Alice', email: 'agent1@helpdesk.com', role: 'agent', name: 'Agent Alice Cooper', badge: 'Support Agent' },
  { label: 'Agent Bob', email: 'agent2@helpdesk.com', role: 'agent', name: 'Agent Bob Miller', badge: 'Support Agent' },
  { label: 'Manager Sarah', email: 'manager@helpdesk.com', role: 'manager', name: 'Manager Sarah', badge: 'Manager' },
  { label: 'Administrator', email: 'admin@helpdesk.com', role: 'admin', name: 'System Administrator', badge: 'Admin' }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();
  public personas = PERSONAS;

  constructor(
    private api: ApiService,
    private socket: SocketService,
    private toast: ToastService
  ) {
    this.initSession();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  private async initSession() {
    const token = localStorage.getItem('helpdesk_token');
    const savedUser = localStorage.getItem('helpdesk_user');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.userSubject.next(user);
        this.socket.connect(token);
      } catch {
        this.logout();
      }
    } else {
      // Fast start default persona
      this.loginAsPersona('customer1@helpdesk.com');
    }
  }

  async login(email: string, password = 'Password@123') {
    try {
      const res = await this.api.auth.login({ email, password });
      if (res.success && res.token) {
        localStorage.setItem('helpdesk_token', res.token);
        localStorage.setItem('helpdesk_user', JSON.stringify(res.data));
        this.userSubject.next(res.data);
        this.socket.connect(res.token);
        this.toast.success(`Logged in as ${res.data.name} (${res.data.role.toUpperCase()})`);
        return true;
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Login failed');
      return false;
    }
    return false;
  }

  async loginAsPersona(email: string) {
    return this.login(email, 'Password@123');
  }

  async register(userData: { name: string; email: string; password: string; role?: string }) {
    try {
      const res = await this.api.auth.register(userData);
      if (res.success && res.token) {
        localStorage.setItem('helpdesk_token', res.token);
        localStorage.setItem('helpdesk_user', JSON.stringify(res.data));
        this.userSubject.next(res.data);
        this.socket.connect(res.token);
        this.toast.success(`Account created: ${res.data.name}`);
        return true;
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Registration failed');
      return false;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('helpdesk_token');
    localStorage.removeItem('helpdesk_user');
    this.userSubject.next(null);
    this.socket.disconnect();
    this.toast.info('Logged out successfully');
  }
}
