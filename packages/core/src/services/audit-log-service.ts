export interface AuditEvent {
  orgId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogService {
  private events: AuditEvent[] = [];

  record(event: AuditEvent): AuditEvent {
    this.events.push(event);
    return event;
  }

  list(): AuditEvent[] {
    return [...this.events];
  }
}
