import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket, CommentItem, Rating, User } from '../../models/types';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-ticket-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content modal-large" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-main">
            <div class="badges-row">
              <span class="badge" [ngClass]="'badge-' + ticket.status.toLowerCase().replace(' ', '-')">{{ ticket.status }}</span>
              <span class="badge" [ngClass]="'badge-' + ticket.priority.toLowerCase()">{{ ticket.priority }}</span>
              <span class="badge badge-secondary">{{ ticket.category }}</span>
              <span *ngIf="ticket.isEscalated" class="badge badge-urgent">⚠️ ESCALATED</span>
              <span *ngIf="isBreached()" class="badge badge-breached">⏰ SLA BREACHED</span>
            </div>
            <h2 class="ticket-title">{{ ticket.title }}</h2>
            <div class="ticket-meta">
              <span>Created by <strong>{{ getCustomerName() }}</strong></span>
              <span>•</span>
              <span>Assigned: <strong>{{ getAgentName() }}</strong></span>
              <span>•</span>
              <span>Target SLA: <strong>{{ formatSlaDue() }}</strong></span>
            </div>
          </div>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <!-- Description Box -->
        <div class="description-box">
          <div class="box-title">Description</div>
          <p class="description-text">{{ ticket.description }}</p>
          <div *ngIf="ticket.isEscalated && ticket.escalationReason" class="escalation-alert">
            <strong>Escalation Reason:</strong> {{ ticket.escalationReason }}
          </div>
        </div>

        <!-- Staff Action Toolbar (Agent, Manager, Admin) -->
        <div *ngIf="isStaff()" class="staff-toolbar">
          <div class="toolbar-title">Staff State Machine & Workflow Controls</div>
          <div class="toolbar-actions">
            <!-- Status Transitions -->
            <button 
              *ngIf="ticket.status === 'Open'" 
              (click)="changeStatus('In Progress')"
              class="btn btn-primary btn-sm"
            >
              Start Progress
            </button>

            <button 
              *ngIf="ticket.status === 'In Progress'" 
              (click)="changeStatus('On Hold')"
              class="btn btn-warning btn-sm"
            >
              Put On Hold
            </button>

            <button 
              *ngIf="ticket.status === 'On Hold'" 
              (click)="changeStatus('In Progress')"
              class="btn btn-primary btn-sm"
            >
              Resume Work
            </button>

            <button 
              *ngIf="ticket.status === 'In Progress' || ticket.status === 'On Hold'" 
              (click)="changeStatus('Resolved')"
              class="btn btn-success btn-sm"
            >
              Mark Resolved
            </button>

            <button 
              *ngIf="ticket.status === 'Resolved' && (auth.currentUser?.role === 'manager' || auth.currentUser?.role === 'admin')" 
              (click)="changeStatus('Closed')"
              class="btn btn-secondary btn-sm"
            >
              Close Ticket
            </button>

            <!-- Auto-Assign -->
            <button 
              *ngIf="!ticket.assignedAgentId" 
              (click)="autoAssign()"
              class="btn btn-secondary btn-sm"
            >
              ⚡ Auto-Assign Agent
            </button>

            <!-- Escalate -->
            <button 
              *ngIf="!ticket.isEscalated && ticket.status !== 'Closed'" 
              (click)="promptEscalate()"
              class="btn btn-danger btn-sm"
            >
              🔺 Escalate Ticket
            </button>
          </div>
        </div>

        <!-- Customer Rating Widget (for Resolved / Closed Tickets) -->
        <div *ngIf="auth.currentUser?.role === 'customer' && (ticket.status === 'Resolved' || ticket.status === 'Closed')" class="rating-box">
          <div class="box-title">⭐ Customer Satisfaction (CSAT) Rating</div>
          <ng-container *ngIf="existingRating; else ratingForm">
            <div class="existing-rating">
              <div class="stars">
                <span *ngFor="let s of [1,2,3,4,5]" class="star filled">{{ s <= existingRating.score ? '★' : '☆' }}</span>
              </div>
              <p *ngIf="existingRating.comment" class="rating-comment">"{{ existingRating.comment }}"</p>
              <div class="rating-note">Thank you! Your feedback helps our support team improve.</div>
            </div>
          </ng-container>

          <ng-template #ratingForm>
            <div class="rating-input-group">
              <div class="star-selector">
                <button 
                  *ngFor="let s of [1,2,3,4,5]" 
                  type="button" 
                  (click)="selectedScore = s"
                  class="star-btn"
                  [class.active]="s <= selectedScore"
                >
                  ★
                </button>
              </div>
              <input 
                type="text" 
                [(ngModel)]="ratingComment" 
                class="form-input rating-input" 
                placeholder="Optional feedback comment on resolution quality..."
              />
              <button (click)="submitRating()" [disabled]="ratingLoading" class="btn btn-success btn-sm">
                {{ ratingLoading ? 'Submitting...' : 'Submit Rating' }}
              </button>
            </div>
          </ng-template>
        </div>

        <!-- Comments Stream -->
        <div class="comments-section">
          <div class="comments-header">
            <div class="box-title">
              Conversation Thread ({{ comments.length }})
            </div>
            <!-- Staff tab filter -->
            <div *ngIf="isStaff()" class="comment-tabs">
              <button [class.active]="commentFilter === 'all'" (click)="commentFilter = 'all'" class="c-tab">All</button>
              <button [class.active]="commentFilter === 'internal'" (click)="commentFilter = 'internal'" class="c-tab">🔒 Internal Only</button>
            </div>
          </div>

          <!-- Comment List -->
          <div class="comment-list">
            <div *ngIf="filteredComments().length === 0" class="empty-comments">
              No comments yet. Start the conversation below.
            </div>

            <div 
              *ngFor="let c of filteredComments()" 
              class="comment-card" 
              [class.internal-note]="c.isInternal"
            >
              <div class="comment-meta">
                <div class="comment-author">
                  <span class="c-avatar">{{ getAuthorInitials(c) }}</span>
                  <span class="c-name">{{ getAuthorName(c) }}</span>
                  <span class="badge badge-sm" [ngClass]="'badge-' + getAuthorRole(c)">{{ getAuthorRole(c) }}</span>
                  <span *ngIf="c.isInternal" class="badge badge-warning badge-sm">🔒 INTERNAL NOTE</span>
                </div>
                <span class="comment-time">{{ formatTime(c.createdAt) }}</span>
              </div>
              <p class="comment-message">{{ c.message }}</p>
            </div>
          </div>

          <!-- Add Comment Box -->
          <form (ngSubmit)="postComment()" class="comment-form">
            <div class="input-row">
              <input 
                type="text" 
                [(ngModel)]="newCommentMessage" 
                name="newComment" 
                class="form-input" 
                placeholder="Write a reply or status update..."
                required
              />
              <button type="submit" [disabled]="commentLoading || !newCommentMessage.trim()" class="btn btn-primary">
                {{ commentLoading ? 'Posting...' : 'Send' }}
              </button>
            </div>

            <!-- Internal Note Checkbox for Staff -->
            <div *ngIf="isStaff()" class="internal-toggle">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="isInternalNote" name="isInternalNote" />
                <span class="toggle-text">🔒 Post as Staff Private Internal Note (strictly hidden from customer)</span>
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-large {
      max-width: 800px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 1rem;
    }

    .badges-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .ticket-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.35rem;
    }

    .ticket-meta {
      display: flex;
      gap: 0.6rem;
      font-size: 0.775rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .ticket-meta strong {
      color: var(--text-secondary);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.75rem;
      cursor: pointer;
    }
    .close-btn:hover { color: var(--text-primary); }

    .description-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1.25rem;
    }

    .box-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    .description-text {
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-primary);
    }

    .escalation-alert {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(244, 63, 94, 0.15);
      border-left: 3px solid var(--rose);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: #ffffff;
    }

    .staff-toolbar {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }

    .toolbar-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--indigo);
      margin-bottom: 0.6rem;
      text-transform: uppercase;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .rating-box {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1.25rem;
    }

    .rating-input-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .star-selector {
      display: flex;
      gap: 0.25rem;
    }

    .star-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .star-btn.active {
      color: var(--amber);
      transform: scale(1.15);
    }

    .rating-input {
      flex: 1;
      min-width: 200px;
    }

    .existing-rating .stars {
      font-size: 1.5rem;
      color: var(--amber);
      margin: 0.25rem 0;
    }

    .rating-comment {
      font-style: italic;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .rating-note {
      font-size: 0.75rem;
      color: var(--emerald);
      margin-top: 0.25rem;
    }

    .comments-section {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem;
    }

    .comments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .comment-tabs {
      display: flex;
      gap: 0.25rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.15rem;
      border-radius: var(--radius-sm);
    }

    .c-tab {
      background: none;
      border: none;
      padding: 0.2rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .c-tab.active {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .comment-list {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-right: 0.5rem;
    }

    .empty-comments {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .comment-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.75rem 0.85rem;
    }

    .comment-card.internal-note {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .comment-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .comment-author {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .c-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--indigo);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
    }

    .c-name {
      font-size: 0.8rem;
      font-weight: 700;
    }

    .badge-sm {
      font-size: 0.65rem;
      padding: 0.05rem 0.35rem;
    }

    .comment-time {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .comment-message {
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-primary);
    }

    .comment-form .input-row {
      display: flex;
      gap: 0.5rem;
    }

    .internal-toggle {
      margin-top: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: var(--amber);
      cursor: pointer;
    }
  `]
})
export class TicketDetailModalComponent implements OnInit, OnDestroy {
  @Input() ticket!: Ticket;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  comments: CommentItem[] = [];
  commentFilter: 'all' | 'internal' = 'all';
  newCommentMessage = '';
  isInternalNote = false;
  commentLoading = false;

  selectedScore = 5;
  ratingComment = '';
  ratingLoading = false;
  existingRating: Rating | null = null;

  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private socket: SocketService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.socket.joinTicketRoom(this.ticket._id);
    this.loadComments();
    this.loadRating();

    // Listen to real-time comments
    this.subs.push(
      this.socket.commentAdded$.subscribe((data) => {
        if (data && data.ticketId === this.ticket._id) {
          this.loadComments();
        }
      }),
      this.socket.commentInternalNote$.subscribe((data) => {
        if (data && data.ticketId === this.ticket._id) {
          this.loadComments();
        }
      })
    );
  }

  ngOnDestroy() {
    this.socket.leaveTicketRoom(this.ticket._id);
    this.subs.forEach(s => s.unsubscribe());
  }

  async loadComments() {
    try {
      const res = await this.api.comments.list(this.ticket._id);
      if (res.success) {
        this.comments = res.data;
      }
    } catch (err: any) {
      console.warn('Failed to load comments:', err.message);
    }
  }

  async loadRating() {
    if (this.ticket.status === 'Resolved' || this.ticket.status === 'Closed') {
      try {
        const res = await this.api.ratings.getByTicket(this.ticket._id);
        if (res.success && res.data) {
          this.existingRating = res.data;
        }
      } catch {
        this.existingRating = null;
      }
    }
  }

  filteredComments(): CommentItem[] {
    if (this.commentFilter === 'internal') {
      return this.comments.filter(c => c.isInternal);
    }
    return this.comments;
  }

  isStaff(): boolean {
    const role = this.auth.currentUser?.role;
    return role === 'agent' || role === 'manager' || role === 'admin';
  }

  getCustomerName(): string {
    if (typeof this.ticket.customerId === 'object' && this.ticket.customerId) {
      return this.ticket.customerId.name;
    }
    return 'Customer';
  }

  getAgentName(): string {
    if (typeof this.ticket.assignedAgentId === 'object' && this.ticket.assignedAgentId) {
      return this.ticket.assignedAgentId.name;
    }
    return 'Unassigned';
  }

  getAuthorName(c: CommentItem): string {
    if (typeof c.authorId === 'object' && c.authorId) {
      return c.authorId.name;
    }
    return 'User';
  }

  getAuthorRole(c: CommentItem): string {
    if (typeof c.authorId === 'object' && c.authorId) {
      return c.authorId.role;
    }
    return 'user';
  }

  getAuthorInitials(c: CommentItem): string {
    return this.getAuthorName(c).charAt(0).toUpperCase();
  }

  isBreached(): boolean {
    if (this.ticket.status === 'Resolved' || this.ticket.status === 'Closed') {
      return false;
    }
    if (!this.ticket.slaDueAt) return false;
    return new Date(this.ticket.slaDueAt).getTime() < Date.now();
  }

  formatSlaDue(): string {
    if (!this.ticket.slaDueAt) return 'No SLA Target';
    const due = new Date(this.ticket.slaDueAt);
    return due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async changeStatus(newStatus: string) {
    try {
      const res = await this.api.tickets.updateStatus(this.ticket._id, newStatus);
      if (res.success) {
        this.ticket.status = newStatus;
        this.toast.success(`Ticket transitioned to ${newStatus}`);
        this.updated.emit();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Status transition rejected by State Machine');
    }
  }

  async autoAssign() {
    try {
      const res = await this.api.tickets.autoAssign(this.ticket._id);
      if (res.success) {
        this.ticket = res.data;
        this.toast.success('Agent automatically assigned by workload engine');
        this.updated.emit();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Auto-assignment failed');
    }
  }

  async promptEscalate() {
    const reason = prompt('Please provide the escalation justification reason:');
    if (reason && reason.trim()) {
      try {
        const res = await this.api.tickets.escalate(this.ticket._id, reason.trim());
        if (res.success) {
          this.ticket.isEscalated = true;
          this.ticket.escalationReason = reason.trim();
          this.toast.warning('Ticket escalated to Senior Management');
          this.updated.emit();
        }
      } catch (err: any) {
        this.toast.error(err.message || 'Escalation failed');
      }
    }
  }

  async postComment() {
    if (!this.newCommentMessage.trim()) return;
    this.commentLoading = true;
    try {
      const res = await this.api.comments.add(
        this.ticket._id,
        this.newCommentMessage.trim(),
        this.isInternalNote
      );
      if (res.success) {
        this.newCommentMessage = '';
        this.isInternalNote = false;
        await this.loadComments();
        this.toast.success('Comment posted');
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Failed to post comment');
    } finally {
      this.commentLoading = false;
    }
  }

  async submitRating() {
    this.ratingLoading = true;
    try {
      const res = await this.api.ratings.create({
        ticketId: this.ticket._id,
        score: this.selectedScore,
        comment: this.ratingComment.trim()
      });
      if (res.success) {
        this.existingRating = res.data;
        this.toast.success('Thank you for rating our service!');
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        this.updated.emit();
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Rating submission failed');
    } finally {
      this.ratingLoading = false;
    }
  }
}
