import React, { useState, useMemo } from 'react';
import { DATA } from './data';
import * as I from './icons';
import { useTickets, useDashboard } from './hooks';
import { useAuth } from './AuthContext';
import {
  Avatar, StatusPill, PriorityBadge, ChannelIcon, CategoryIcon, Tag,
  SLATag, SLABar, formatMin, Card, Stat, PageHeader, Sparkline, LineChart
} from './components';

// ====================================================================
//   CSR DASHBOARD
// ====================================================================
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CSRDashboard({ openTicket, setView }) {
  const { user } = useAuth();
  const { data, loading, reload } = useDashboard();

  const stats     = data?.stats     ?? {};
  const myTickets = data?.my_tickets ?? [];
  const newQueue  = data?.new_queue  ?? [];
  const firstName = user?.name?.split(' ')[0] ?? '';

  const slaAtRisk = myTickets.filter(
    (t) => (t.slaResolution.elapsed / t.slaResolution.target) > 0.5
  );

  // Format avg response delta vs 7d average
  const responseToday = stats.avg_first_response_today_min;
  const response7d    = stats.avg_first_response_7d_min;
  const responseDelta = (responseToday != null && response7d != null && response7d > 0)
    ? Math.round(responseToday - response7d)
    : null;

  const weekEscPct = stats.week_handled > 0
    ? Math.round((stats.week_escalations / stats.week_handled) * 100)
    : null;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={loading
          ? 'Loading…'
          : `${stats.open_count ?? 0} active tickets · ${stats.sla_breached_count ?? 0} approaching SLA breach · ${stats.awaiting_reply_count ?? 0} awaiting your reply`
        }
        actions={
          <>
            <button className="btn" onClick={reload} disabled={loading}>
              <I.Refresh size={14} /> Refresh
            </button>
            <button className="btn primary" onClick={() => setView?.('new-ticket')}>
              <I.Plus size={14} /> New ticket
            </button>
          </>
        }
      />

      <div className="page-content">
        {/* Top row stats */}
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <Stat
            label="Open tickets"
            value={loading ? '…' : (stats.open_count ?? 0)}
            icon={<I.Inbox size={13} />}
          />
          <Stat
            label="Avg response (today)"
            value={loading ? '…' : (responseToday != null ? formatMin(responseToday) : '—')}
            icon={<I.Clock size={13} />}
            delta={responseDelta != null ? {
              kind: responseDelta <= 0 ? "up" : "down",
              text: `${responseDelta <= 0 ? '−' : '+'}${formatMin(Math.abs(responseDelta))} vs 7d avg`
            } : { text: response7d != null ? `${formatMin(response7d)} 7d avg` : 'No data yet' }}
          />
          <Stat
            label="FCR rate (7d)"
            value={loading ? '…' : (stats.fcr_rate_7d != null ? `${stats.fcr_rate_7d}%` : '—')}
            valueColor="var(--sla-ok)"
            icon={<I.CheckCircle size={13} />}
            delta={{ text: 'Target 80–90%' }}
          />
          <Stat
            label="My CSAT (30d)"
            value={loading ? '…' : (stats.csat_30d != null ? stats.csat_30d : '—')}
            icon={<I.Star size={13} />}
          />
        </div>

        <div className="dash-cols">
          {/* Left column */}
          <div className="col gap-4">
            {/* My active tickets */}
            <Card
              title="My active tickets"
              action={
                <div className="tabs" style={{ border: 0 }}>
                  <button className="tab active" style={{ padding: "4px 10px" }}>
                    Assigned <span className="count">{loading ? '…' : myTickets.length}</span>
                  </button>
                </div>
              }
            >
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
              ) : myTickets.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>No active tickets assigned to you</div>
              ) : (
                <>
                  <div>
                    {myTickets.slice(0, 6).map((t) => (
                      <DashboardTicketRow key={t.id} t={t} onClick={() => openTicket(t.id)} />
                    ))}
                  </div>
                  {myTickets.length > 6 && (
                    <div style={{ padding: "10px 16px", borderTop: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12.5 }}>
                      <span>Showing 6 of {myTickets.length} assigned</span>
                      <a style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }} onClick={() => setView?.('tickets')}>View all →</a>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* SLA at risk */}
            <Card
              title="SLA at risk"
              action={<span className="badge"><I.Alert size={11} style={{ color: "var(--sla-breach)" }} /> {slaAtRisk.length} items</span>}
            >
              <div style={{ padding: "4px 16px 12px" }}>
                {slaAtRisk.length === 0 ? (
                  <div style={{ padding: "12px 0", fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>
                    All SLAs on track
                  </div>
                ) : slaAtRisk.slice(0, 3).map((t) => (
                  <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--divider)", cursor: "pointer" }}
                    onClick={() => openTicket(t.id)}>
                    <div className="row gap-3" style={{ marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t.ticket_id}</span>
                      <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }} className="truncate">{t.title}</span>
                      <PriorityBadge priority={t.priority} />
                      <SLATag sla={t.slaResolution} />
                    </div>
                    <SLABar sla={t.slaResolution} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="col gap-4">
            <Card title="New in queue" action={<a style={{ color: "var(--accent)", fontSize: 12, cursor: "pointer" }} onClick={() => setView?.('tickets')}>Pick up →</a>}>
              <div style={{ padding: 4 }}>
                {loading ? (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
                ) : newQueue.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Queue is clear</div>
                ) : newQueue.slice(0, 4).map((t) => (
                  <div key={t.id} style={{
                    padding: "10px 12px", margin: 4,
                    border: "1px solid var(--divider)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg)",
                    cursor: "pointer"
                  }} onClick={() => openTicket(t.id)}>
                    <div className="row gap-2" style={{ marginBottom: 6 }}>
                      <PriorityBadge priority={t.priority} />
                      <ChannelIcon channel={t.channel} size={12} />
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
                        {formatMin(t.createdMinAgo)} ago
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-strong)", marginBottom: 4 }} className="truncate">{t.title}</div>
                    <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      <span>{t.company}</span>
                      {t.vip ? <span className="badge" style={{ padding: "0 5px", fontSize: 10, color: "oklch(0.55 0.18 70)", borderColor: "color-mix(in oklch, oklch(0.7 0.18 70) 40%, transparent)" }}>VIP</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Quick KB search">
              <div style={{ padding: 12 }}>
                <div className="search-input" style={{ marginBottom: 10 }}>
                  <I.Search size={14} />
                  <input placeholder="Search articles…" />
                </div>
                <div className="col gap-2">
                  {DATA.KB_ARTICLES.slice(0, 3).map((kb) => (
                    <div key={kb.id} style={{
                      padding: "8px 10px", borderRadius: "var(--radius-md)",
                      cursor: "pointer", border: "1px solid transparent"
                    }} onMouseOver={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                       onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 12.5, color: "var(--text-strong)", marginBottom: 2 }}>{kb.title}</div>
                      <div className="row gap-2" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        <span>{kb.cat}</span><span>·</span><span>{kb.views} views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="This week" padded>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Tickets handled</div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--text-strong)" }}>
                    {loading ? '…' : (stats.week_handled ?? 0)}
                  </div>
                </div>
              </div>
              <div className="divider-h" style={{ margin: "10px 0" }}></div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Avg resolution</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                    {loading ? '…' : (stats.week_avg_resolution_min != null ? formatMin(stats.week_avg_resolution_min) : '—')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Escalations</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                    {loading ? '…' : (stats.week_escalations ?? 0)}
                    {weekEscPct != null && <span style={{ fontSize: 12, color: "var(--text-muted)" }}> · {weekEscPct}%</span>}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTicketRow({ t, onClick }) {
  return (
    <div className="row gap-3" style={{
      padding: "12px 16px", borderBottom: "1px solid var(--divider)", cursor: "pointer"
    }} onClick={onClick}
       onMouseOver={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
       onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
      <PriorityBadge priority={t.priority} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ marginBottom: 2 }}>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{t.ticket_id}</span>
          <ChannelIcon channel={t.channel} size={11} />
          {t.vip ? <span className="badge" style={{ padding: "0 5px", fontSize: 10, color: "oklch(0.55 0.18 70)" }}>VIP</span> : null}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text-strong)", marginBottom: 2 }} className="truncate">{t.title}</div>
        <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          <span>{t.company}</span>
          <span>·</span>
          <span>{formatMin(t.createdMinAgo)} ago</span>
          {t.commentCount ? <><span>·</span><span><I.MessageSquare size={10} style={{ marginRight: 2, marginBottom: -1 }} />{t.commentCount}</span></> : null}
        </div>
      </div>
      <StatusPill status={t.status} />
      <div style={{ width: 130 }}>
        <SLATag sla={t.slaResolution} />
      </div>
    </div>
  );
}

// ====================================================================
//   TICKETS LIST
// ====================================================================
const STATUS_FILTER_MAP = {
  new:       ['New'],
  open:      ['Open'],
  waiting:   ['Waiting for Client'],
  escalated: ['Escalated to Dev', 'Under Review', 'Deferred to Sprint'],
  'in-dev':  ['In Development', 'In QA/Testing', 'Ready for Deployment'],
  resolved:  ['Resolved', 'Deployed', 'Closed'],
};

export function TicketsList({ openTicket }) {
  const [filter, setFilter]   = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort]       = useState("priority");
  const [page, setPage]       = useState(1);

  const { tickets, meta, loading, error, reload } = useTickets({ page, per_page: 25 });

  const priOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };

  const list = useMemo(() => {
    let l = [...tickets];
    const allowed = STATUS_FILTER_MAP[filter];
    if (allowed) l = l.filter(t => allowed.includes(t.status));
    if (filter === "breached") l = l.filter(t => t.slaResolution.breached);
    if (sort === "priority") l.sort((a, b) => (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9) || a.createdMinAgo - b.createdMinAgo);
    if (sort === "newest")   l.sort((a, b) => a.createdMinAgo - b.createdMinAgo);
    if (sort === "oldest")   l.sort((a, b) => b.createdMinAgo - a.createdMinAgo);
    return l;
  }, [tickets, filter, sort]);

  const counts = useMemo(() => {
    const c = { all: tickets.length, breached: 0 };
    Object.entries(STATUS_FILTER_MAP).forEach(([key, statuses]) => {
      c[key] = tickets.filter(t => statuses.includes(t.status)).length;
    });
    c.breached = tickets.filter(t => t.slaResolution.breached).length;
    return c;
  }, [tickets]);

  const filters = [
    { id: "all",       label: "All",               count: meta?.total ?? tickets.length },
    { id: "new",       label: "New",               count: counts.new },
    { id: "open",      label: "Open",              count: counts.open },
    { id: "waiting",   label: "Waiting on client", count: counts.waiting },
    { id: "escalated", label: "Escalated",         count: counts.escalated },
    { id: "in-dev",    label: "In development",    count: counts['in-dev'] },
    { id: "resolved",  label: "Resolved",          count: counts.resolved },
    { id: "breached",  label: "SLA breached",      count: counts.breached, danger: true },
  ];

  const toggleSel = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === list.length) setSelected(new Set());
    else setSelected(new Set(list.map(t => t.id)));
  };

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1;

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle={`${meta?.total ?? tickets.length} tickets · ${counts.breached} SLA breached`}
        actions={
          <>
            <button className="btn" onClick={reload}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary"><I.Plus size={14} /> New ticket</button>
          </>
        }
        tabs={filters}
        activeTab={filter}
        onTab={(f) => { setFilter(f); setSelected(new Set()); }}
      />

      <div className="page-content" style={{ paddingTop: 16 }}>
        <div className="row gap-2" style={{ marginBottom: 12, justifyContent: "space-between" }}>
          <div className="row gap-2">
            {selected.size > 0 ? (
              <div className="row gap-2" style={{ padding: "4px 10px", background: "var(--accent-soft)", borderRadius: "var(--radius-md)", color: "var(--accent)", fontSize: 12 }}>
                <span>{selected.size} selected</span>
                <button className="btn sm ghost" style={{ color: "var(--accent)" }}><I.CheckCircle size={12} /> Close</button>
              </div>
            ) : null}
          </div>
          <select className="select" style={{ width: 160, paddingRight: 28 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: 16, color: "oklch(0.55 0.2 20)", background: "oklch(0.97 0.02 20)", borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 780 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "36px 130px 1fr 100px 150px 120px 130px 50px",
                alignItems: "center", padding: "9px 16px", gap: 12,
                background: "var(--bg-sunken)", borderBottom: "1px solid var(--divider)",
                fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}>
                <input type="checkbox"
                  checked={selected.size > 0 && selected.size === list.length}
                  ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < list.length; }}
                  onChange={toggleAll}
                />
                <span>Ticket</span><span>Subject</span><span>Priority</span>
                <span>Status</span><span>Assignee</span><span>SLA</span><span></span>
              </div>

              {loading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading tickets…</div>
              ) : list.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>No tickets found</div>
              ) : (
                list.map(t => (
                  <TicketListRow key={t.id} t={t}
                    selected={selected.has(t.id)}
                    onToggle={() => toggleSel(t.id)}
                    onClick={() => openTicket(t.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14, justifyContent: "space-between", fontSize: 12.5, color: "var(--text-muted)" }}>
          <span>Showing {list.length} of {meta?.total ?? tickets.length} tickets</span>
          {totalPages > 1 && (
            <div className="row gap-2">
              <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><I.ChevronLeft size={12} /></button>
              <span className="mono">{page} / {totalPages}</span>
              <button className="btn sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><I.ChevronRight size={12} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketListRow({ t, selected, onToggle, onClick }) {
  const csr = t.csr;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 130px 1fr 100px 150px 120px 130px 50px",
        alignItems: "center", padding: "12px 16px", gap: 12,
        borderBottom: "1px solid var(--divider)", cursor: "pointer",
        background: selected ? "var(--accent-soft)" : "transparent",
        position: "relative"
      }}
      onMouseOver={(e) => { if (!selected) e.currentTarget.style.background = "var(--panel-hover)"; }}
      onMouseOut={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
      onClick={onClick}
    >
      <input type="checkbox" checked={selected} onChange={(e) => { e.stopPropagation(); onToggle(); }} onClick={(e) => e.stopPropagation()} />
      <div className="col" style={{ gap: 2 }}>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--text-strong)" }}>{t.ticket_id}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }} className="mono">{formatMin(t.createdMinAgo)} ago</span>
      </div>
      <div className="col" style={{ gap: 4, minWidth: 0 }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ color: "var(--text-muted)" }}>{CategoryIcon({ category: t.category, size: 12 })}</span>
          <span style={{ fontSize: 13.5, color: "var(--text-strong)", fontWeight: 500 }} className="truncate">{t.title}</span>
          {t.new ? <span className="badge" style={{ padding: "0 5px", fontSize: 10, color: "var(--accent)", background: "var(--accent-soft)", border: 0 }}>NEW</span> : null}
        </div>
        <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--text-muted)", minWidth: 0 }}>
          <ChannelIcon channel={t.channel} size={11} />
          <span className="truncate">{t.company}</span>
          {t.vip ? <span className="badge" style={{ padding: "0 5px", fontSize: 9.5, color: "oklch(0.55 0.18 70)", borderColor: "color-mix(in oklch, oklch(0.7 0.18 70) 40%, transparent)" }}>VIP</span> : null}
          {t.commentCount ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><I.MessageSquare size={10} />{t.commentCount}</span> : null}
          {t.attachmentCount ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><I.Paperclip size={10} />{t.attachmentCount}</span> : null}
          {t.tags && t.tags.length ? t.tags.slice(0, 2).map((tag) => <Tag key={tag} name={tag} />) : null}
        </div>
      </div>
      <PriorityBadge priority={t.priority} />
      <StatusPill status={t.status} />
      <div className="row gap-2">
        {csr ? (
          <>
            <Avatar user={csr} size="sm" />
            <span style={{ fontSize: 12, color: "var(--text)" }} className="truncate">{csr.name.split(" ")[0]}</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Unassigned</span>
        )}
      </div>
      <div className="col" style={{ gap: 4 }}>
        <SLATag sla={t.slaResolution} />
        <SLABar sla={t.slaResolution} height={3} />
      </div>
      <button className="btn ghost icon" onClick={(e) => e.stopPropagation()}><I.MoreH size={14} /></button>
    </div>
  );
}
