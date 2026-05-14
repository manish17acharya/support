import React, { useState, useMemo } from 'react';
import * as I from './icons';
import {
  Avatar, StatusPill, PriorityBadge, ChannelIcon, CategoryIcon,
  Tag, SLATag, SLABar, formatMin, Card, Stat, PageHeader, Sparkline, LineChart
} from './components';
import { useAnalytics, useKbArticles, useCompanies, useUsers, useTickets } from './hooks';
import { useAuth } from './AuthContext';

// ====================================================================
//   ANALYTICS / REPORTS — Admin dashboard
// ====================================================================
export function Analytics() {
  const { data: a, loading, error, reload } = useAnalytics();

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)', fontSize: 13 }}>
      Loading analytics…
    </div>
  );
  if (error || !a) return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 300, justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-muted)' }}>{error || 'No data'}</span>
      <button className="btn sm" onClick={reload}>Retry</button>
    </div>
  );

  const trendDelta = a.ticketsLastWeek > 0
    ? ((a.ticketsThisWeek - a.ticketsLastWeek) / a.ticketsLastWeek * 100).toFixed(1)
    : null;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={`Operational health · last 7 days`}
        actions={
          <>
            <button className="btn" onClick={reload}><I.Refresh size={14} /> Refresh</button>
            <button className="btn"><I.Download size={14} /> Export PDF</button>
          </>
        }
      />
      <div className="page-content">
        {/* Headline stats */}
        <div className="grid-5" style={{ marginBottom: 20 }}>
          <Stat label="Tickets this week" value={a.ticketsThisWeek}
            icon={<I.Inbox size={13} />}
            delta={trendDelta != null ? { kind: a.ticketsThisWeek >= a.ticketsLastWeek ? "up" : "down", text: `${trendDelta > 0 ? '+' : ''}${trendDelta}% vs last week` } : undefined} />
          <Stat label="SLA compliance" value={(a.slaCompliance ?? '—') + (a.slaCompliance != null ? "%" : "")}
            valueColor="var(--sla-ok)"
            icon={<I.Clock size={13} />} delta={{ text: "Target 95%" }} />
          <Stat label="First-contact resolution" value={a.fcrRate != null ? a.fcrRate + "%" : "—"}
            icon={<I.CheckCircle size={13} />} />
          <Stat label="CSAT (avg)" value={a.csat ?? "—"}
            icon={<I.Star size={13} />}
            delta={a.csatResponses ? { text: `${a.csatResponses} responses · ${a.csatRate}% rate` } : undefined} />
          <Stat label="Avg resolution" value={a.avgResolutionHours != null ? a.avgResolutionHours + "h" : "—"}
            icon={<I.TrendingDown size={13} />} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Trend */}
          <Card title="Ticket volume" action={
            <div className="row gap-3" style={{ fontSize: 11.5 }}>
              <span className="row gap-1"><span style={{ width: 10, height: 2, background: "var(--accent)" }}></span>Created</span>
              <span className="row gap-1"><span style={{ width: 10, height: 2, background: "var(--sla-ok)", borderStyle: "dashed", borderWidth: "1px 0", borderColor: "var(--sla-ok)" }}></span>Resolved</span>
            </div>
          }>
            <div style={{ padding: "16px 20px 12px" }}>
              <LineChart a={a.daily} b={a.resolved} labels={a.trendLabels} height={180} />
            </div>
          </Card>

          {/* Status breakdown */}
          <Card title="Open by priority">
            <div style={{ padding: 16 }}>
              <div className="col gap-3">
                {Object.entries(a.openByPriority).map(([pri, count]) => {
                  const total = Object.values(a.openByPriority).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const colors = { Critical: "var(--pri-critical)", High: "var(--pri-high)", Medium: "var(--pri-medium)", Low: "var(--pri-low)" };
                  return (
                    <div key={pri}>
                      <div className="row gap-2" style={{ marginBottom: 4 }}>
                        <PriorityBadge priority={pri} />
                        <span style={{ marginLeft: "auto", fontSize: 12 }} className="mono">{count}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }} className="mono">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="sla-bar" style={{ height: 6 }}>
                        <div className="fill" style={{ width: pct + "%", background: colors[pri] }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Channels */}
          <Card title="Intake channels">
            <div style={{ padding: 16 }}>
              {a.byChannel.length === 0 ? (
                <div className="empty">No tickets this week</div>
              ) : a.byChannel.map((c) => {
                const max = Math.max(...a.byChannel.map((x) => x.value));
                const pct = max > 0 ? (c.value / max) * 100 : 0;
                return (
                  <div key={c.name} className="row gap-3" style={{ padding: "7px 0" }}>
                    <ChannelIcon channel={c.name} size={13} />
                    <span style={{ fontSize: 12.5, width: 90 }}>{c.name}</span>
                    <div style={{ flex: 1, background: "var(--bg-sunken)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: "var(--accent)", opacity: 0.85 }}></div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, width: 36, textAlign: "right" }}>{c.value}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CSAT widget */}
          <Card title="Customer satisfaction (30 days)">
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "120px 1fr", gap: 20, alignItems: "center" }}>
              <div className="donut" style={{ "--p": a.csat ? Math.round(a.csat / 5 * 100) : 0, "--c": "var(--sla-ok)" }}>
                <span>{a.csat ?? "—"}</span>
              </div>
              <div className="col gap-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  return (
                    <div key={star} className="row gap-2">
                      <span className="row gap-1 mono" style={{ fontSize: 11, color: "var(--text-muted)", width: 30 }}>
                        {star}<I.Star size={9} />
                      </span>
                      <div style={{ flex: 1, background: "var(--bg-sunken)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                        <div style={{ width: "0%", height: "100%", background: star >= 4 ? "var(--sla-ok)" : star === 3 ? "var(--sla-warn)" : "var(--sla-breach)" }}></div>
                      </div>
                    </div>
                  );
                })}
                {a.csatResponses > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {a.csatResponses} responses — <strong>{a.csatRate}%</strong> response rate
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* CSR leaderboard */}
        {a.csrLeaderboard?.length > 0 && (
          <Card title="CSR performance (this week)">
            <table className="table">
              <thead>
                <tr>
                  <th>CSR</th>
                  <th>Tickets handled</th>
                  <th>First contact resolution</th>
                  <th>SLA met</th>
                  <th>CSAT</th>
                </tr>
              </thead>
              <tbody>
                {a.csrLeaderboard.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="row gap-2">
                        <Avatar user={{ initials: r.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), color: 'var(--accent)' }} />
                        <div className="col" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 13 }}>{r.handled}</td>
                    <td>
                      <div className="row gap-2">
                        <span className="mono">{r.fcr}%</span>
                        <div style={{ flex: 1, maxWidth: 120, background: "var(--bg-sunken)", height: 5, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: r.fcr + "%", height: "100%", background: r.fcr >= 85 ? "var(--sla-ok)" : "var(--sla-warn)" }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{r.slaHits}<span style={{ color: "var(--text-muted)" }}>/{r.handled}</span></td>
                    <td>
                      {r.csat != null ? (
                        <span className="row gap-1" style={{ fontSize: 13 }}>
                          <I.Star size={11} style={{ color: "var(--sla-warn)", fill: "currentColor" }} /> <span className="mono">{r.csat}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

// ====================================================================
//   KNOWLEDGE BASE
// ====================================================================
export function KnowledgeBase({ openTicket }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { articles, loading } = useKbArticles(debouncedQ);

  const cats = [...new Set(articles.map((a) => a.category).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        subtitle="Solved issues, FAQs, and runbooks · searchable from any ticket"
        actions={
          <>
            <button className="btn"><I.Download size={14} /> Export</button>
            <button className="btn primary"><I.Plus size={14} /> New article</button>
          </>
        }
      />

      <div className="page-content kb-cols">
        {/* Categories sidebar */}
        <div className="col gap-1">
          <div className="section-label" style={{ marginBottom: 6, padding: "0 8px" }}>Categories</div>
          <div className="nav-item active" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <I.BookOpen size={14} /> All articles
            <span className="badge" style={{ marginLeft: "auto" }}>{articles.length}</span>
          </div>
          {cats.map((c) => (
            <div key={c} className="nav-item">
              <I.Folder size={14} /> {c}
              <span className="badge" style={{ marginLeft: "auto", padding: "0 5px" }}>{articles.filter((a) => a.category === c).length}</span>
            </div>
          ))}
          <div style={{ height: 12 }}></div>
          <div className="section-label" style={{ marginBottom: 6, padding: "0 8px" }}>Status</div>
          <div className="nav-item"><I.CheckCircle size={14} /> Published <span className="badge" style={{ marginLeft: "auto" }}>{articles.filter(a => a.status === 'Published').length}</span></div>
          <div className="nav-item"><I.Edit size={14} /> Drafts <span className="badge" style={{ marginLeft: "auto" }}>{articles.filter(a => a.status === 'Draft').length}</span></div>
          <div className="nav-item"><I.Trash size={14} /> Archived <span className="badge" style={{ marginLeft: "auto" }}>{articles.filter(a => a.status === 'Archived').length}</span></div>
        </div>

        {/* Content */}
        <div className="col gap-4">
          <div className="search-input" style={{ padding: "8px 12px" }}>
            <I.Search size={16} />
            <input
              placeholder="Search by title, content, or tag — e.g. 'PayPal IPN'"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ fontSize: 14 }}
            />
            <span className="kbd">⌘K</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : articles.length === 0 ? (
            <div className="empty">No articles found</div>
          ) : (
            <Card title="All articles" action={<div className="row gap-2"><button className="btn sm"><I.Sliders size={12} /></button></div>}>
              <table className="table">
                <thead>
                  <tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Views</th><th>Updated</th><th></th></tr>
                </thead>
                <tbody>
                  {articles.map((kb) => (
                    <tr key={kb.id}>
                      <td>
                        <div className="col" style={{ gap: 2 }}>
                          <span style={{ fontWeight: 500, color: "var(--text-strong)" }}>{kb.title}</span>
                          <div className="row gap-1">{(kb.tags ?? []).map((t) => <Tag key={t} name={t} />)}</div>
                        </div>
                      </td>
                      <td><span className="badge">{kb.category ?? '—'}</span></td>
                      <td style={{ fontSize: 12.5 }}>{kb.author ?? '—'}</td>
                      <td>
                        <span className="status-pill" style={{
                          "--status-color": kb.status === "Published" ? "var(--sla-ok)" : kb.status === "Draft" ? "var(--sla-warn)" : "var(--text-muted)"
                        }}>
                          <span className="dot"></span>{kb.status}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{(kb.views ?? 0).toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {kb.updated_at ? new Date(kb.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td><button className="btn ghost icon"><I.MoreH size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
//   CLIENT PORTAL VIEW
// ====================================================================
export function ClientPortal({ openTicket }) {
  const { user } = useAuth();
  const companyId = user?.client_company_id ?? null;

  const params = useMemo(() => {
    if (!companyId) return {};
    return { company_id: companyId, per_page: 50 };
  }, [companyId]);

  const { tickets, loading } = useTickets(params);

  const openCount      = tickets.filter(t => !['Resolved','Deployed','Closed'].includes(t.status) && t.status !== 'Closed').length;
  const waitingCount   = tickets.filter(t => t.status === 'WaitingClient').length;
  const resolvedCount  = tickets.filter(t => ['Resolved','Deployed','Closed'].includes(t.status)).length;

  return (
    <div>
      <PageHeader
        title="Your support tickets"
        subtitle={user?.name ? `${user.name}` : 'Client portal'}
        actions={<button className="btn primary"><I.Plus size={14} /> New request</button>}
      />
      <div className="page-content" style={{ maxWidth: 920 }}>
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <Stat label="Open"              value={loading ? '…' : openCount}     icon={<I.Clock size={13} />} />
          <Stat label="Awaiting your reply" value={loading ? '…' : waitingCount} icon={<I.MessageSquare size={13} />} />
          <Stat label="Resolved (all time)" value={loading ? '…' : resolvedCount} icon={<I.CheckCircle size={13} />} valueColor="var(--sla-ok)" />
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="empty">No tickets found for your account</div>
        ) : (
          <div className="col gap-3">
            {tickets.map((t) => (
              <div key={t.id} className="card" style={{ padding: 16, cursor: "pointer" }} onClick={() => openTicket(t.id)}>
                <div className="row gap-3" style={{ marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t.ticket_id}</span>
                  <StatusPill status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }} className="mono">
                    {formatMin(t.createdMinAgo)} ago
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-strong)", marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{(t.description ?? '').slice(0, 180)}{t.description?.length > 180 ? '…' : ''}</div>
                <div className="row gap-3" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--divider)", fontSize: 12, color: "var(--text-muted)" }}>
                  {t.csr && <span><I.User size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />Handled by {t.csr.name}</span>}
                  <span><I.MessageSquare size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />{t.commentCount} replies</span>
                  <span style={{ marginLeft: "auto" }} className="row gap-1">
                    View ticket <I.ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================================
//   COMPANIES / USERS / AUDIT (admin)
// ====================================================================
export function CompaniesView() {
  const { companies, loading, error, reload } = useCompanies();

  return (
    <div>
      <PageHeader
        title="Client companies"
        subtitle={loading ? 'Loading…' : `${companies.length} companies · ${companies.filter((c) => c.is_vip).length} VIP`}
        actions={
          <>
            <button className="btn" onClick={reload} disabled={loading}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary"><I.Plus size={14} /> Add company</button>
          </>
        }
      />
      <div className="page-content">
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div className="empty" style={{ color: 'var(--sla-breach)' }}>{error}</div>
        ) : (
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Company</th><th>Primary email</th><th>Tier</th><th>Contacts</th><th>Open tickets</th><th>Lifetime tickets</th><th>CSAT (90d)</th><th></th></tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="row gap-2">
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-sunken)", display: "grid", placeItems: "center", fontWeight: 600, color: "var(--text-strong)", fontSize: 12 }}>{c.name[0]}</div>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{c.primary_email ?? '—'}</td>
                      <td>{c.is_vip ? <span className="badge" style={{ color: "oklch(0.55 0.18 70)", borderColor: "color-mix(in oklch, oklch(0.7 0.18 70) 40%, transparent)" }}>VIP</span> : <span className="badge">Standard</span>}</td>
                      <td className="mono">{c.contacts_count ?? 0}</td>
                      <td>
                        <span className="mono" style={{ color: c.open_tickets_count > 5 ? "var(--sla-warn)" : "var(--text)" }}>{c.open_tickets_count ?? 0}</span>
                      </td>
                      <td className="mono">{c.lifetime_tickets_count ?? 0}</td>
                      <td>
                        {c.csat_avg != null
                          ? <span className="row gap-1"><I.Star size={11} style={{ color: "var(--sla-warn)", fill: "currentColor" }} /><span className="mono">{c.csat_avg}</span></span>
                          : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                      <td><button className="btn ghost icon"><I.MoreH size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export function UsersView() {
  const { users, loading } = useUsers();

  const byRole = useMemo(() => {
    const counts = { CSR: 0, Bridge: 0, Developer: 0, QA: 0, Admin: 0 };
    for (const u of users) { if (counts[u.role] !== undefined) counts[u.role]++; }
    return counts;
  }, [users]);

  return (
    <div>
      <PageHeader
        title="Users & roles"
        subtitle="Manage staff access, role assignments, and team membership"
        actions={<>
          <button className="btn"><I.Download size={14} /> Export</button>
          <button className="btn primary"><I.Plus size={14} /> Invite user</button>
        </>}
      />
      <div className="page-content">
        <div className="grid-5" style={{ marginBottom: 20 }}>
          {[
            { role: "CSR",       icon: <I.User size={13} /> },
            { role: "Bridge",    icon: <I.GitBranch size={13} /> },
            { role: "Developer", icon: <I.Code size={13} /> },
            { role: "QA",        icon: <I.CheckCircle size={13} /> },
            { role: "Admin",     icon: <I.Settings size={13} /> },
          ].map((r) => (
            <div key={r.role} className="stat-card">
              <div className="stat-label">{r.icon}<span>{r.role}s</span></div>
              <div className="stat-value">{loading ? '…' : byRole[r.role] ?? 0}</div>
            </div>
          ))}
        </div>

        <Card>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Active tickets</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row gap-2">
                        <Avatar user={{ initials: u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), color: 'var(--accent)' }} />
                        <div className="col" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }} className="mono">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: 0 }}>{u.role}</span>
                    </td>
                    <td>
                      <span className="row gap-1" style={{ fontSize: 12 }}>
                        <span className="live-dot"></span>Active
                      </span>
                    </td>
                    <td className="mono">{u.active_tickets_count ?? 0}</td>
                    <td><button className="btn ghost icon"><I.MoreH size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AuditLog() {
  const items = [
    { action: "ticket.status_changed", actor: "Bridge", role: "Bridge", details: "Status: Open → Escalated to Dev", ticket: "SUP-2026-0514-018", minAgo: 22 },
    { action: "comment.added", actor: "CSR", role: "CSR", details: "Client-facing reply sent", ticket: "SUP-2026-0514-018", minAgo: 56 },
    { action: "ticket.priority_changed", actor: "CSR", role: "CSR", details: "Priority: High → Critical", ticket: "SUP-2026-0514-018", minAgo: 76 },
    { action: "ticket.created", actor: "Client", role: "Client", details: "Created via Email channel", ticket: "SUP-2026-0514-018", minAgo: 78 },
    { action: "user.login", actor: "Admin", role: "Admin", details: "IP 203.0.113.42, Chrome 124 on macOS", ticket: null, minAgo: 90 },
    { action: "sla.breach", actor: "STMS", role: "System", details: "First response SLA breached (target 60m)", ticket: "SUP-2026-0514-018", minAgo: 18 },
    { action: "csat.recorded", actor: "Client", role: "Client", details: "5 stars — 'Quick and clear, thanks'", ticket: "SUP-2026-0514-012", minAgo: 320 },
  ];

  const colors = {
    "ticket.status_changed": "var(--status-open)",
    "comment.added": "var(--accent)",
    "ticket.priority_changed": "var(--sla-warn)",
    "ticket.created": "var(--status-new)",
    "user.login": "var(--text-muted)",
    "sla.breach": "var(--sla-breach)",
    "csat.recorded": "var(--sla-warn)",
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of every action — retained 3 years · Admin access only"
        actions={
          <>
            <input className="input" placeholder="Filter by action or actor…" style={{ width: 240 }} />
            <button className="btn"><I.Download size={14} /> Export</button>
          </>
        }
      />
      <div className="page-content">
        <Card>
          <table className="table">
            <thead>
              <tr><th>When</th><th>Action</th><th>Actor</th><th>Details</th><th>Ticket</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatMin(it.minAgo)} ago</td>
                  <td>
                    <span className="mono" style={{ fontSize: 11.5, padding: "2px 7px", borderRadius: 4, background: "color-mix(in oklch, " + (colors[it.action] || 'var(--text-muted)') + " 12%, transparent)", color: colors[it.action] || 'var(--text-muted)' }}>
                      {it.action}
                    </span>
                  </td>
                  <td>
                    <div className="row gap-2">
                      <Avatar user={{ initials: it.actor.slice(0,2).toUpperCase(), color: it.role === "Client" ? "oklch(0.55 0.18 50)" : "var(--accent)" }} size="sm" />
                      <span style={{ fontSize: 12.5 }}>{it.role}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{it.details}</td>
                  <td>{it.ticket ? <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{it.ticket}</span> : <span style={{ color: "var(--text-faint)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

export function SettingsView() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration · SLA tiers, channels, automation rules" />
      <div className="page-content" style={{ maxWidth: 920 }}>
        <Card title="SLA tier configuration">
          <table className="table">
            <thead>
              <tr><th>Priority</th><th>First response</th><th>Resolution</th><th>Use case</th><th></th></tr>
            </thead>
            <tbody>
              {[
                { name: 'Critical', resp: '1h',  res: '4h',  use: 'System down, data loss, security' },
                { name: 'High',     resp: '4h',  res: '8h',  use: 'Major feature broken, workflow impacted' },
                { name: 'Medium',   resp: '8h',  res: '24h', use: 'Partial functionality, workaround available' },
                { name: 'Low',      resp: '16h', res: '56h', use: 'Cosmetic, general inquiry' },
              ].map(p => (
                <tr key={p.name}>
                  <td><PriorityBadge priority={p.name} /></td>
                  <td className="mono">{p.resp}</td>
                  <td className="mono">{p.res}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.use}</td>
                  <td><button className="btn ghost icon sm"><I.Edit size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ height: 16 }}></div>

        <Card title="Auto-close behaviour">
          <div style={{ padding: 16 }}>
            <FormSwitch label="Auto-close resolved tickets after no client response" sub="Default: 3 business days" on />
            <FormSwitch label="Send auto-close warning email at day 2" on />
            <FormSwitch label="Allow client to reopen via email reply (7 days)" on />
            <FormSwitch label="Send CSAT survey on every closure" on />
          </div>
        </Card>

        <div style={{ height: 16 }}></div>

        <Card title="Notification channels">
          <div style={{ padding: 16 }}>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {["Email", "Web Form", "Phone", "WhatsApp", "Walk-in"].map((c) => (
                <div key={c} className="row gap-2" style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <ChannelIcon channel={c} size={14} />
                  <span style={{ fontSize: 13 }}>{c}</span>
                  <span className="badge" style={{ background: "color-mix(in oklch, var(--sla-ok) 12%, transparent)", color: "var(--sla-ok)", border: 0 }}>Enabled</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FormSwitch({ label, sub, on }) {
  const [v, setV] = useState(!!on);
  return (
    <div className="row gap-3" style={{ padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
      <div className="col" style={{ gap: 1, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        {sub ? <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{sub}</span> : null}
      </div>
      <button
        onClick={() => setV(!v)}
        style={{
          width: 36, height: 20, padding: 0,
          border: 0, borderRadius: 999,
          background: v ? "var(--accent)" : "var(--border-strong)",
          position: "relative", cursor: "pointer", transition: "background 0.16s"
        }}>
        <span style={{
          position: "absolute", top: 2,
          left: v ? 18 : 2,
          width: 16, height: 16,
          background: "white", borderRadius: 999,
          transition: "left 0.16s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
        }}></span>
      </button>
    </div>
  );
}
