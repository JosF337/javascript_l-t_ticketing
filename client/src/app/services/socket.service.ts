import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  // Socket event streams
  private ticketCreatedSubject = new Subject<any>();
  public ticketCreated$ = this.ticketCreatedSubject.asObservable();

  private ticketAssignedSubject = new Subject<any>();
  public ticketAssigned$ = this.ticketAssignedSubject.asObservable();

  private ticketStatusChangedSubject = new Subject<any>();
  public ticketStatusChanged$ = this.ticketStatusChangedSubject.asObservable();

  private ticketEscalatedSubject = new Subject<any>();
  public ticketEscalated$ = this.ticketEscalatedSubject.asObservable();

  private commentAddedSubject = new Subject<any>();
  public commentAdded$ = this.commentAddedSubject.asObservable();

  private commentInternalNoteSubject = new Subject<any>();
  public commentInternalNote$ = this.commentInternalNoteSubject.asObservable();

  private slaBreachAlertSubject = new Subject<any>();
  public slaBreachAlert$ = this.slaBreachAlertSubject.asObservable();

  private ratingSubmittedSubject = new Subject<any>();
  public ratingSubmitted$ = this.ratingSubmittedSubject.asObservable();

  connect(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    if (!token) return;

    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      this.connectedSubject.next(false);
    });

    // Register event listeners
    this.socket.on('ticket:created', (data) => this.ticketCreatedSubject.next(data));
    this.socket.on('ticket:assigned', (data) => this.ticketAssignedSubject.next(data));
    this.socket.on('ticket:status_changed', (data) => this.ticketStatusChangedSubject.next(data));
    this.socket.on('ticket:escalated', (data) => this.ticketEscalatedSubject.next(data));
    this.socket.on('comment:added', (data) => this.commentAddedSubject.next(data));
    this.socket.on('comment:internal_note', (data) => this.commentInternalNoteSubject.next(data));
    this.socket.on('sla:breach_alert', (data) => this.slaBreachAlertSubject.next(data));
    this.socket.on('rating:submitted', (data) => this.ratingSubmittedSubject.next(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
    }
  }

  joinTicketRoom(ticketId: string) {
    if (this.socket && this.socket.connected && ticketId) {
      this.socket.emit('join_ticket', ticketId);
    }
  }

  leaveTicketRoom(ticketId: string) {
    if (this.socket && this.socket.connected && ticketId) {
      this.socket.emit('leave_ticket', ticketId);
    }
  }
}
