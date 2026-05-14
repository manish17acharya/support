import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as I from './icons';
import { useTickets, useDashboard, useKbArticles, useLookups, useUsers } from './hooks';
import { useAuth } from './AuthContext';
import api from './api';
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

            <QuickKbSearch />

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

// Maps status tab IDs → comma-separated DB status names for the API
const TAB_STATUSES = {
  new:       'New',
  open:      'Open',
  waiting:   'Waiting for Client',
  escalated: 'Escalated to Dev,Under Review,Deferred to Sprint',
  'in-dev':  'In Development,In QA/Testing,Ready for Deployment,Deployed',
  resolved:  'Resolved,Closed',
};

export function TicketsList({ openTicket, setView }) {
  const { lookups }              = useLookups();
  const { users: csrUsers }      = useUsers('CSR');

  const [tab,            setTab]            = useState("all");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCsr,      setFilterCsr]      = useState("");
  const [filterFrom,     setFilterFrom]     = useState("");
  const [filterTo,       setFilterTo]       = useState("");
  const [sort,           setSort]           = useState("priority");
  const [page,           setPage]           = useState(1);
  const [selected,       setSelected]       = useState(new Set());
  const [bulkActioning,  setBulkActioning]  = useState(false);

  const params = useMemo(() => {
    const p = { page, per_page: 25 };
    if (tab !== 'all' && tab !== 'breached' && TAB_STATUSES[tab]) p.statuses = TAB_STATUSES[tab];
    if (filterPriority) p.priority    = filterPriority;
    if (filterCategory) p.category_id = filterCategory;
    if (filterCsr)      p.csr         = filterCsr;
    if (filterFrom)     p.created_after  = filterFrom;
    if (filterTo)       p.created_before = filterTo;
    return p;
  }, [tab, filterPriority, filterCategory, filterCsr, filterFrom, filterTo, page]);

  const { tickets, meta, loading, error, reload } = useTickets(params);

  const statusMap = useMemo(() => {
    const m = {};
    for (const s of lookups?.statuses ?? []) m[s.name] = s;
    return m;
  }, [lookups]);

  const priOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const list = useMemo(() => {
    let l = [...tickets];
    if (tab === 'breached') l = l.filter(t => t.slaResolution.breached);
    if (sort === 'priority') l.sort((a, b) => (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9) || a.createdMinAgo - b.createdMinAgo);
    if (sort === 'newest')   l.sort((a, b) => a.createdMinAgo - b.createdMinAgo);
    if (sort === 'oldest')   l.sort((a, b) => b.createdMinAgo - a.createdMinAgo);
    return l;
  }, [tickets, sort, tab]);

  const activeFilters = [filterPriority, filterCategory, filterCsr, filterFrom, filterTo].filter(Boolean).length;

  function changeTab(t) { setTab(t); setSelected(new Set()); setPage(1); }
  function clearFilters() {
    setFilterPriority(''); setFilterCategory(''); setFilterCsr('');
    setFilterFrom(''); setFilterTo(''); setPage(1);
  }

  const toggleSel = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const toggleAll = () => {
    setSelected(selected.size === list.length ? new Set() : new Set(list.map(t => t.id)));
  };

  async function bulkAssignCsr(csrId) {
    if (!csrId) return;
    setBulkActioning(true);
    try {
      await Promise.all([...selected].map(id =>
        api.patch(`/tickets/${id}/assign`, { role: 'csr', user_id: +csrId })
      ));
      reload(); setSelected(new Set());
    } finally { setBulkActioning(false); }
  }

  async function bulkSetStatus(statusName) {
    const status = statusMap[statusName];
    if (!status) return;
    setBulkActioning(true);
    try {
      await Promise.all([...selected].map(id =>
        api.patch(`/tickets/${id}/status`, { status_id: status.id })
      ));
      reload(); setSelected(new Set());
    } finally { setBulkActioning(false); }
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1;
  const breachedCount = tickets.filter(t => t.slaResolution.breached).length;

  const tabs = [
    { id: "all",       label: "All",            count: tab === 'all'       ? meta?.total : undefined },
    { id: "new",       label: "New",            count: tab === 'new'       ? meta?.total : undefined },
    { id: "open",      label: "Open",           count: tab === 'open'      ? meta?.total : undefined },
    { id: "waiting",   label: "Waiting",        count: tab === 'waiting'   ? meta?.total : undefined },
    { id: "escalated", label: "Escalated",      count: tab === 'escalated' ? meta?.total : undefined },
    { id: "in-dev",    label: "In dev",         count: tab === 'in-dev'    ? meta?.total : undefined },
    { id: "resolved",  label: "Resolved",       count: tab === 'resolved'  ? meta?.total : undefined },
    { id: "breached",  label: "SLA breached",   count: breachedCount || undefined, danger: true },
  ];

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle={`${meta?.total ?? tickets.length} ticket${(meta?.total ?? tickets.length) !== 1 ? 's' : ''} · ${breachedCount} SLA breached`}
        actions={
          <>
            <button className="btn" onClick={reload} disabled={loading}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary" onClick={() => setView?.('new-ticket')}><I.Plus size={14} /> New ticket</button>
          </>
        }
        tabs={tabs}
        activeTab={tab}
        onTab={changeTab}
      />

      <div className="page-content" style={{ paddingTop: 16 }}>

        {/* Filter bar */}
        <div className="row gap-2" style={{ marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select" style={{ width: 'auto', fontSize: 12.5 }}
            value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }}>
            <option value="">Priority: All</option>
            {(lookups?.priorities ?? []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="select" style={{ width: 'auto', fontSize: 12.5 }}
            value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="">Category: All</option>
            {(lookups?.categories ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="select" style={{ width: 'auto', fontSize: 12.5 }}
            value={filterCsr} onChange={e => { setFilterCsr(e.target.value); setPage(1); }}>
            <option value="">Assignee: Any</option>
            {csrUsers.filter(u => u.is_active !== false).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <input type="date" className="input" title="Created from"
            style={{ width: 'auto', fontSize: 12.5, padding: '4px 10px' }}
            value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} />
          <input type="date" className="input" title="Created to"
            style={{ width: 'auto', fontSize: 12.5, padding: '4px 10px' }}
            value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} />
          {activeFilters > 0 && (
            <button className="btn ghost sm" onClick={clearFilters}>
              <I.X size={11} /> Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <select className="select" style={{ width: 160 }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="row gap-2" style={{
            padding: "8px 12px", marginBottom: 10,
            background: "var(--accent-soft)", borderRadius: "var(--radius-md)",
            border: "1px solid color-mix(in oklch, var(--accent) 25%, transparent)",
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--accent)" }}>
              {selected.size} ticket{selected.size !== 1 ? 's' : ''} selected
            </span>
            <span style={{ color: "var(--accent)", opacity: 0.4 }}>·</span>
            <select className="select" style={{ width: 'auto', fontSize: 12.5, padding: '3px 28px 3px 8px' }}
              disabled={bulkActioning}
              defaultValue=""
              onChange={e => { bulkAssignCsr(e.target.value); e.target.value = ''; }}>
              <option value="" disabled>Assign CSR…</option>
              {csrUsers.filter(u => u.is_active !== false).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select className="select" style={{ width: 'auto', fontSize: 12.5, padding: '3px 28px 3px 8px' }}
              disabled={bulkActioning}
              defaultValue=""
              onChange={e => { bulkSetStatus(e.target.value); e.target.value = ''; }}>
              <option value="" disabled>Change status…</option>
              <option value="Open">Open</option>
              <option value="Waiting for Client">Waiting for client</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            {bulkActioning && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Applying to {selected.size} tickets…</span>
            )}
            <button className="btn ghost sm" style={{ marginLeft: 'auto' }}
              onClick={() => setSelected(new Set())} disabled={bulkActioning}>
              <I.X size={12} /> Deselect all
            </button>
          </div>
        )}

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
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < list.length; }}
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

function QuickKbSearch() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { articles, loading } = useKbArticles(debouncedQ);
  const shown = articles.filter(a => a.status === 'Published').slice(0, 3);

  return (
    <div className="card">
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-strong)' }}>
        Quick KB search
      </div>
      <div style={{ padding: 12 }}>
        <div className="search-input" style={{ marginBottom: 10 }}>
          <I.Search size={14} />
          <input
            placeholder="Search articles…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="col gap-1">
          {loading ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-faint)' }}>{debouncedQ ? 'No articles found' : 'No published articles yet'}</div>
          ) : shown.map(kb => (
            <div key={kb.id} style={{
              padding: '8px 10px', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', border: '1px solid transparent',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--panel-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 12.5, color: 'var(--text-strong)', marginBottom: 2 }}>{kb.title}</div>
              <div className="row gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {kb.category && <span>{kb.category}</span>}
                {kb.category && <span>·</span>}
                <span>{(kb.views ?? 0).toLocaleString()} views</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
