import React, { useState, useEffect } from 'react';
import { DATA } from './data';
import * as I from './icons';
import {
  Avatar, StatusPill, PriorityBadge, ChannelIcon, CategoryIcon,
  Tag, SLATag, SLABar, formatMin, Card, Stat, PageHeader, Sparkline, LineChart
} from './components';
import { useLookups, useEscalatedTickets, useSprints, useTickets } from './hooks';
import { useAuth } from './AuthContext';
import api from './api';

// ====================================================================
//   NEW TICKET — CSR raises on behalf
// ====================================================================
export function NewTicketForm({ back }) {
  const { lookups, loading: lookupsLoading } = useLookups();

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [priorityId, setPriorityId]     = useState(null);
  const [categoryId, setCategoryId]     = useState('');
  const [channelId, setChannelId]       = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [errors, setErrors]             = useState({});

  // Set sensible defaults once lookups arrive
  useEffect(() => {
    if (!lookups) return;
    if (!priorityId) {
      const high = lookups.priorities?.find(p => p.name === 'High');
      if (high) setPriorityId(high.id);
    }
    if (!categoryId && lookups.categories?.length) setCategoryId(String(lookups.categories[0].id));
    if (!channelId  && lookups.channels?.length)   setChannelId(String(lookups.channels[0].id));
  }, [lookups]);

  const selectedPriority = lookups?.priorities?.find(p => p.id === priorityId);

  const slaText = {
    Critical: '1h response · 4h resolution',
    High:     '4h response · 1d resolution',
    Medium:   '1d response · 3d resolution',
    Low:      '2d response · 7d resolution',
  }[selectedPriority?.name] ?? '—';

  const responseText = {
    Critical: '1 business hour',
    High:     '4 business hours',
    Medium:   '1 business day',
    Low:      '2 business days',
  }[selectedPriority?.name] ?? '—';

  async function handleSubmit() {
    setErrors({});

    const local = {};
    if (!title.trim())        local.title = 'Subject is required';
    if (!description.trim())  local.description = 'Description is required';
    if (!contactEmail.trim()) local.contact_email = 'Contact email is required';
    if (!priorityId)          local.priority_id = 'Priority is required';
    if (!categoryId)          local.category_id = 'Category is required';
    if (!channelId)           local.intake_channel_id = 'Intake channel is required';
    if (Object.keys(local).length) { setErrors(local); return; }

    setSubmitting(true);
    try {
      await api.post('/tickets', {
        title:             title.trim(),
        description:       description.trim(),
        contact_email:     contactEmail.trim(),
        priority_id:       priorityId,
        category_id:       parseInt(categoryId),
        intake_channel_id: parseInt(channelId),
      });
      back();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else setErrors({ general: data?.message ?? 'Failed to create ticket — please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New ticket"
        subtitle="Raising on behalf of a client — they'll receive an auto-confirmation email with the Ticket ID"
        actions={
          <>
            {errors.general && (
              <span style={{ fontSize: 12.5, color: 'var(--sla-breach)' }}>{errors.general}</span>
            )}
            <button className="btn" onClick={back} disabled={submitting}>Cancel</button>
            <button className="btn primary" onClick={handleSubmit} disabled={submitting || lookupsLoading}>
              <I.Send size={14} /> {submitting ? 'Creating…' : 'Create ticket'}
            </button>
          </>
        }
      />

      <div className="page-content form-cols">
        {/* Left column: form */}
        <div className="col gap-4">
          <Card title="Client">
            <div style={{ padding: 16 }}>
              <FormField label="Contact email" required>
                <input
                  className="input"
                  type="email"
                  placeholder="client@company.example"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  style={errors.contact_email ? { borderColor: 'var(--sla-breach)' } : {}}
                />
                <FieldError msg={errors.contact_email} />
              </FormField>
            </div>
          </Card>

          <Card title="Issue">
            <div style={{ padding: 16 }}>
              <FormField label="Subject" required>
                <input
                  className="input"
                  placeholder="One-line description of the issue (max 255 chars)"
                  maxLength={255}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={errors.title ? { borderColor: 'var(--sla-breach)' } : {}}
                />
                <FieldError msg={errors.title} />
              </FormField>
              <FormField label="Description" required style={{ marginTop: 12 }}>
                <textarea
                  className="textarea"
                  placeholder="Detailed description — steps to reproduce, expected vs actual behaviour…"
                  style={{ minHeight: 140, ...(errors.description ? { borderColor: 'var(--sla-breach)' } : {}) }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <FieldError msg={errors.description} />
              </FormField>
            </div>
          </Card>

          <Card title="Classification">
            <div style={{ padding: 16 }}>
              <div className="grid-3" style={{ gap: 14 }}>
                <FormField label="Category" required>
                  <select
                    className="select"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    disabled={lookupsLoading}
                  >
                    {lookupsLoading
                      ? <option>Loading…</option>
                      : lookups?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    }
                  </select>
                  <FieldError msg={errors.category_id} />
                </FormField>
                <FormField label="Priority" required>
                  <div className="row gap-1">
                    {lookupsLoading
                      ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</span>
                      : lookups?.priorities?.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPriorityId(p.id)}
                            className={"btn sm" + (priorityId === p.id ? "" : " ghost")}
                            style={{
                              flex: 1, padding: "5px 8px",
                              background: priorityId === p.id ? "var(--panel-2)" : "transparent",
                              border: "1px solid " + (priorityId === p.id ? "var(--border-strong)" : "var(--border)")
                            }}
                          >
                            <PriorityBadge priority={p.name} />
                          </button>
                        ))
                    }
                  </div>
                  <FieldError msg={errors.priority_id} />
                </FormField>
                <FormField label="Intake channel" required>
                  <select
                    className="select"
                    value={channelId}
                    onChange={e => setChannelId(e.target.value)}
                    disabled={lookupsLoading}
                  >
                    {lookupsLoading
                      ? <option>Loading…</option>
                      : lookups?.channels?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    }
                  </select>
                  <FieldError msg={errors.intake_channel_id} />
                </FormField>
              </div>
            </div>
          </Card>

          <Card title="Internal notes (optional)">
            <div style={{ padding: 16 }}>
              <textarea
                className="textarea"
                placeholder="Call summary, context, anything the team should know — not sent to client."
                style={{ minHeight: 80, background: "color-mix(in oklch, oklch(0.95 0.06 80) 60%, var(--panel))" }}
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Right column: live preview */}
        <div className="col gap-4">
          <Card title="Auto actions">
            <div style={{ padding: 16 }}>
              <PreviewRow icon={<I.Code size={12} />} text={<>Ticket ID: <span className="mono">auto-generated on save</span></>} />
              <PreviewRow icon={<I.Mail size={12} />} text="Confirmation email sent to client" />
              <PreviewRow icon={<I.User size={12} />} text="Auto-assigned via round-robin" />
              <PreviewRow icon={<I.Clock size={12} />} text={
                selectedPriority
                  ? <>SLA timer starts — <span className="mono">{slaText}</span></>
                  : 'SLA timer starts on creation'
              } />
              <PreviewRow icon={<I.Bell size={12} />} text="In-app + email alerts to CSR" />
            </div>
          </Card>

          <Card title="Confirmation email preview">
            <div style={{ padding: 14 }}>
              <div style={{
                padding: 12, background: "var(--bg-sunken)", borderRadius: "var(--radius-md)",
                fontSize: 12, lineHeight: 1.6
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }} className="mono">
                  Subject: [Ticket #TBD] Your Support Request Has Been Received
                </div>
                <div className="divider-h" style={{ margin: "8px 0" }}></div>
                <div style={{ color: "var(--text)" }}>
                  Hi {contactEmail ? contactEmail.split('@')[0] : 'Client'},<br /><br />
                  We've received your request and it's been added to our queue.<br />
                  {selectedPriority && (
                    <>Priority: <strong>{selectedPriority.name}</strong> — expected first response within {responseText}.<br /></>
                  )}
                  <br />
                  Reply to this email at any time — your message will be threaded.<br /><br />
                  — Support Team
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  const text = Array.isArray(msg) ? msg[0] : msg;
  return <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 4 }}>{text}</div>;
}

function FormField({ label, required, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: 5 }}>
        {label}{required ? <span style={{ color: "var(--sla-breach)", marginLeft: 3 }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function PreviewRow({ icon, text }) {
  return (
    <div className="row gap-2" style={{ padding: "6px 0", fontSize: 12.5, color: "var(--text)" }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ====================================================================
//   BRIDGE PERSON — escalations queue
// ====================================================================
export function BridgeView({ openTicket }) {
  const { tickets, loading, reload } = useEscalatedTickets();

  const STATUS_COLS = [
    { key: 'EscalatedDev',   dbName: 'Escalated to Dev',      title: 'Just Escalated',     color: 'var(--status-escalated)' },
    { key: 'UnderReview',    dbName: 'Under Review',          title: 'Under Review',       color: 'var(--status-review)' },
    { key: 'DeferredSprint', dbName: 'Deferred to Sprint',    title: 'Deferred to Sprint', color: 'var(--status-sprint)' },
    { key: 'InDevelopment',  dbName: 'In Development',        title: 'In Development',     color: 'var(--status-dev)' },
    { key: 'InQA',           dbName: 'In QA/Testing',         title: 'In QA',              color: 'var(--status-qa)' },
    { key: 'ReadyDeploy',    dbName: 'Ready for Deployment',  title: 'Ready to Deploy',    color: 'var(--status-deploy)' },
  ];

  const countFor = (key) => tickets.filter(t => t.status === key).length;

  return (
    <div>
      <PageHeader
        title="Escalations"
        subtitle={loading ? 'Loading…' : `${tickets.length} tickets in Tier 2 flow · ${tickets.filter(t => t.slaResolution.breached).length} SLA breached`}
        actions={
          <>
            <button className="btn" onClick={reload} disabled={loading}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary"><I.Plus size={14} /> Add to sprint</button>
          </>
        }
      />

      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 20, gap: 14 }}>
          <Stat label="Awaiting triage"  value={loading ? '…' : countFor('EscalatedDev')}   icon={<I.Alert size={13} />} valueColor="var(--sla-breach)" />
          <Stat label="Active dev work"  value={loading ? '…' : countFor('InDevelopment')}  icon={<I.Code size={13} />} />
          <Stat label="In QA"            value={loading ? '…' : countFor('InQA')}            icon={<I.CheckCircle size={13} />} />
          <Stat label="Ready to deploy"  value={loading ? '…' : countFor('ReadyDeploy')}    icon={<I.Send size={13} />} valueColor="var(--sla-ok)" />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(260px, 1fr))',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 12,
        }}>
          {STATUS_COLS.map((col) => {
            const items = tickets.filter(t => t.status === col.key);
            return (
              <div key={col.key} style={{
                background: 'var(--panel-2)', border: '1px solid var(--divider)',
                borderRadius: 'var(--radius-lg)', minHeight: 480,
                display: 'flex', flexDirection: 'column',
              }}>
                <div className="row gap-2" style={{ padding: '10px 12px', borderBottom: '1px solid var(--divider)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: col.color, flexShrink: 0 }}></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{col.title}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {loading ? '…' : items.length}
                  </span>
                </div>
                <div className="col gap-2" style={{ padding: 10, overflowY: 'auto', flex: 1 }}>
                  {loading ? (
                    <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>Loading…</div>
                  ) : items.length === 0 ? (
                    <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>No tickets</div>
                  ) : items.map(t => <KanbanCard key={t.id} t={t} onClick={() => openTicket(t.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ t, onClick }) {
  return (
    <div className="card fade-in" style={{ padding: 12, cursor: 'pointer' }} onClick={onClick}>
      <div className="row gap-2" style={{ marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{t.ticket_id}</span>
        <PriorityBadge priority={t.priority} />
        {t.vip ? <span className="badge" style={{ padding: '0 4px', fontSize: 9.5, color: 'oklch(0.55 0.18 70)' }}>VIP</span> : null}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-strong)', lineHeight: 1.4, marginBottom: 8 }}>{t.title}</div>
      <div className="row gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: t.sprintName ? 6 : 0 }}>
        {t.company ? <><I.Building size={11} /><span className="truncate" style={{ minWidth: 0 }}>{t.company}</span></> : null}
      </div>
      {t.sprintName ? (
        <div className="row gap-1" style={{ fontSize: 10.5, color: 'var(--accent)', marginBottom: 8 }}>
          <I.Layers size={10} /> <span>{t.sprintName}</span>
        </div>
      ) : null}
      <div className="row gap-2" style={{ paddingTop: 6, borderTop: '1px solid var(--divider)', fontSize: 11 }}>
        <SLATag sla={t.slaResolution} />
        <div className="row gap-1" style={{ marginLeft: 'auto' }}>
          {t.dev  ? <Avatar user={t.dev}  size="sm" /> : null}
          {t.qa   ? <Avatar user={t.qa}   size="sm" /> : null}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
//   SPRINTS
// ====================================================================
export function SprintsView({ openTicket }) {
  const { sprints, loading: sprintsLoading, reload } = useSprints();
  const [selectedSprintId, setSelectedSprintId] = useState(null);

  // Auto-select active sprint on load
  React.useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      const active = sprints.find(s => s.status === 'Active');
      setSelectedSprintId((active ?? sprints[0]).id);
    }
  }, [sprints]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) ?? null;
  const { tickets: sprintTickets, loading: ticketsLoading } = useTickets(
    selectedSprintId ? { sprint_id: selectedSprintId, per_page: 100 } : {}
  );

  const SPRINT_BOARD_COLS = [
    { key: 'InDevelopment', title: 'In Dev',  color: 'var(--status-dev)' },
    { key: 'InQA',          title: 'In QA',   color: 'var(--status-qa)' },
    { key: 'ReadyDeploy',   title: 'Ready',   color: 'var(--status-deploy)' },
    { key: 'Deployed',      title: 'Done',    color: 'var(--status-deployed)' },
  ];

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function daysRemaining(endDate) {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
    return diff;
  }

  return (
    <div>
      <PageHeader
        title="Sprint board"
        subtitle="Tickets scheduled into development sprints — visible to Bridge, Dev, and QA"
        actions={
          <>
            <button className="btn" onClick={reload} disabled={sprintsLoading}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary"><I.Plus size={14} /> New sprint</button>
          </>
        }
      />
      <div className="page-content">
        {/* Sprint summary cards */}
        <div className="grid-4" style={{ marginBottom: 24, gap: 14 }}>
          {sprintsLoading ? (
            <div style={{ gridColumn: '1/-1', padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading sprints…</div>
          ) : sprints.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: 16, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No sprints yet</div>
          ) : sprints.map(s => {
            const isActive   = s.status === 'Active';
            const isSelected = s.id === selectedSprintId;
            return (
              <div key={s.id} className="card"
                style={{
                  padding: 14, cursor: 'pointer',
                  borderLeftWidth: 3, borderLeftStyle: 'solid',
                  borderLeftColor: isSelected ? 'var(--accent)' : isActive ? 'var(--accent)' : 'var(--border)',
                  outline: isSelected ? '2px solid var(--accent-soft)' : 'none',
                }}
                onClick={() => setSelectedSprintId(s.id)}>
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{s.name}</span>
                  <span className="badge" style={{
                    fontSize: 10.5, border: 0,
                    color: isActive ? 'var(--accent)' : s.status === 'Completed' ? 'var(--sla-ok)' : 'var(--text-muted)',
                    background: isActive ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                  }}>{s.status}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }} className="mono">
                  {formatDate(s.start_date)} → {formatDate(s.end_date)}
                </div>
                <div className="row gap-3">
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tickets</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{s.tickets_count ?? 0}</div>
                  </div>
                  {isActive && daysRemaining(s.end_date) != null && (
                    <div style={{ marginLeft: 'auto' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remaining</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: daysRemaining(s.end_date) <= 2 ? 'var(--sla-breach)' : 'var(--text-strong)' }}>
                        {Math.max(0, daysRemaining(s.end_date))}d
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected sprint mini-board */}
        {selectedSprint && (
          <div className="card">
            <div className="row gap-3" style={{ padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{selectedSprint.name}</span>
              <span className="badge" style={{
                background: selectedSprint.status === 'Active' ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                color: selectedSprint.status === 'Active' ? 'var(--accent)' : selectedSprint.status === 'Completed' ? 'var(--sla-ok)' : 'var(--text-muted)',
                border: 0,
              }}>{selectedSprint.status}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatDate(selectedSprint.start_date)} → {formatDate(selectedSprint.end_date)}
              </span>
              {selectedSprint.status === 'Active' && daysRemaining(selectedSprint.end_date) != null && (
                <span style={{ fontSize: 12, color: daysRemaining(selectedSprint.end_date) <= 2 ? 'var(--sla-breach)' : 'var(--text-muted)' }}>
                  · {Math.max(0, daysRemaining(selectedSprint.end_date))} days remaining
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16 }}>
              {SPRINT_BOARD_COLS.map(col => {
                const items = sprintTickets.filter(t => t.status === col.key);
                return (
                  <div key={col.key}>
                    <div className="row gap-2" style={{ padding: '0 4px 8px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: col.color, flexShrink: 0 }}></span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{col.title}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {ticketsLoading ? '…' : items.length}
                      </span>
                    </div>
                    <div className="col gap-2">
                      {ticketsLoading ? (
                        <div style={{ padding: 16, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>Loading…</div>
                      ) : items.length === 0 ? (
                        <div style={{ padding: 16, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>Empty</div>
                      ) : items.slice(0, 5).map(t => <KanbanCard key={t.id} t={t} onClick={() => openTicket(t.id)} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================================
//   DEVELOPER / QA "MY WORK" VIEW
// ====================================================================
export function DevWorkView({ role, openTicket }) {
  const { user } = useAuth();

  const devStatuses = 'In Development,In QA/Testing,Ready for Deployment';
  const qaStatuses  = 'In QA/Testing,Ready for Deployment';

  const params = React.useMemo(() => {
    if (!user?.id) return {};
    if (role === 'QA')        return { qa_id: user.id, statuses: qaStatuses, per_page: 50 };
    if (role === 'Developer') return { developer_id: user.id, statuses: devStatuses, per_page: 50 };
    // Bridge/Admin: show all in-dev work
    return { statuses: devStatuses, per_page: 50 };
  }, [role, user?.id]);

  const { tickets, loading, reload } = useTickets(params);

  const count = (status) => tickets.filter(t => t.status === status).length;

  const deployedCount = 0; // would need a separate query for deployed-this-sprint

  return (
    <div>
      <PageHeader
        title={role === 'QA' ? 'Testing queue' : 'My development work'}
        subtitle={role === 'QA'
          ? 'Fixes ready to verify before deployment'
          : 'Tickets assigned to you by the Bridge Person'}
        actions={
          <button className="btn" onClick={reload} disabled={loading}><I.Refresh size={14} /> Refresh</button>
        }
      />
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <Stat label="In development"  value={loading ? '…' : count('InDevelopment')} icon={<I.Code size={13} />} />
          <Stat label="In QA"           value={loading ? '…' : count('InQA')}           icon={<I.CheckCircle size={13} />} />
          <Stat label="Ready to deploy" value={loading ? '…' : count('ReadyDeploy')}    icon={<I.Send size={13} />} />
          <Stat label="Total assigned"  value={loading ? '…' : tickets.length}           icon={<I.Layers size={13} />} />
        </div>

        <Card title="Active work">
          <div>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="empty">No tickets in your queue</div>
            ) : tickets.map(t => (
              <div key={t.id} className="row gap-3" style={{
                padding: '14px 16px', borderBottom: '1px solid var(--divider)', cursor: 'pointer',
              }}
                onClick={() => openTicket(t.id)}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--panel-hover)'}
                onMouseOut={(e)  => e.currentTarget.style.background = 'transparent'}>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', width: 100, flexShrink: 0 }}>{t.ticket_id}</span>
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, color: 'var(--text-strong)', fontWeight: 500 }} className="truncate">{t.title}</span>
                  <div className="row gap-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {t.company ? <span>{t.company}</span> : null}
                    {t.sprintName ? <><span>·</span><span className="mono" style={{ color: 'var(--accent)' }}><I.Layers size={10} /> {t.sprintName}</span></> : null}
                    {t.tags?.map(tag => <Tag key={tag} name={tag} />)}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
                <StatusPill status={t.status} />
                <button className="btn sm primary" onClick={(e) => e.stopPropagation()}>
                  {role === 'QA'
                    ? <><I.Check size={11} /> Approve</>
                    : <><I.ArrowRight size={11} /> Push to QA</>}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
