// Normalises API ticket shape → shape the UI components expect

// Maps DB status names → DATA.STATUSES keys used by StatusPill / StatusDropdown
const STATUS_KEY_MAP = {
  'New':                  'New',
  'Open':                 'Open',
  'Waiting for Client':   'WaitingClient',
  'Resolved':             'Resolved',
  'Closed':               'Closed',
  'Escalated to Dev':     'EscalatedDev',
  'Under Review':         'UnderReview',
  'Deferred to Sprint':   'DeferredSprint',
  'In Development':       'InDevelopment',
  'In QA':                'InQA',
  'In QA / Testing':      'InQA',
  'In QA/Testing':        'InQA',
  'Ready to Deploy':      'ReadyDeploy',
  'Ready for Deployment': 'ReadyDeploy',
  'Deployed':             'Deployed',
  'Reopened':             'Reopened',
};

function minutesAgo(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function userShape(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, initials: initials(u.name), color: 'var(--accent)' };
}

function slaShape(createdAt, targetMinutes, breached, respondedAt) {
  const elapsed = minutesAgo(createdAt);
  return { elapsed, target: targetMinutes || 480, breached: !!breached };
}

function adaptStatusHistory(history = []) {
  return history.map(h => ({
    id:           h.id,
    kind:         'status',
    text:         h.old_status
      ? `Status: ${h.old_status.name} → ${h.new_status?.name}`
      : `Status set to ${h.new_status?.name}`,
    actor:        h.changed_by?.name ?? null,
    note:         h.note ?? null,
    createdAt:    h.created_at,
    minAgo:       minutesAgo(h.created_at),
  }));
}

export function adaptTicket(t) {
  const priority   = t.priority?.name  ?? 'Medium';
  const priTargets = { Critical: 240, High: 480, Medium: 1440, Low: 2880 };

  return {
    id:              t.id,
    ticket_id:       t.ticket_id,
    title:           t.title,
    description:     t.description,
    status:          STATUS_KEY_MAP[t.status?.name] ?? 'New',
    priority,
    category:        t.category?.name ?? 'General Inquiry',
    channel:         t.intake_channel?.name ?? 'Email',
    company:         t.company?.name  ?? '',
    contact:         t.contact_email  ?? '',
    contactEmail:    t.contact_email  ?? '',
    vip:             !!t.company?.is_vip,
    csrId:           t.assigned_csr_id,
    bridgeId:        t.bridge_person_id,
    devId:           t.assigned_developer_id,
    qaId:            t.assigned_qa_id,
    csr:             userShape(t.assigned_csr),
    bridge:          userShape(t.bridge_person),
    dev:             userShape(t.developer),
    qa:              userShape(t.qa),
    createdAt:       t.created_at,
    createdMinAgo:   minutesAgo(t.created_at),
    resolvedAt:      t.resolved_at,
    closedAt:        t.closed_at,
    commentCount:    t.comments_count ?? t.comments?.length ?? 0,
    attachmentCount: 0,
    tags:            (t.tags ?? []).map(tag => tag.name),
    watchers:        0,
    raisedByCsr:     !!t.raised_by_csr,
    firstResponseMin: t.first_responded_at
      ? Math.max(0, minutesAgo(t.created_at) - minutesAgo(t.first_responded_at))
      : null,
    slaResponse: slaShape(
      t.created_at,
      t.priority?.response_time_minutes,
      t.sla_response_breached,
      t.first_responded_at
    ),
    slaResolution: slaShape(
      t.created_at,
      t.priority?.resolution_time_minutes ?? priTargets[priority],
      t.sla_resolution_breached,
      t.resolved_at
    ),
    comments:       (t.comments ?? []).map(adaptComment),
    statusHistory:  adaptStatusHistory(t.status_history ?? []),
    sprintId:       t.sprint_id ?? null,
    sprintName:     t.sprint?.name ?? null,
    _raw: t,
  };
}

export function adaptComment(c) {
  const author = c.author;
  return {
    id:         c.id,
    type:       c.comment_type,
    channel:    c.channel,
    body:       c.content,
    content:    c.content,
    author:     userShape(author),
    authorName: author?.name ?? 'Unknown',
    authorRole: author?.role ?? 'Staff',
    direction:  c.comment_type === 'Client_Facing' ? 'out' : 'in',
    createdAt:  c.created_at,
    minAgo:     minutesAgo(c.created_at),
  };
}
