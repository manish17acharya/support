import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import api from './api';
import * as I from './icons';
import {
  Avatar, StatusPill, PriorityBadge, ChannelIcon, CategoryIcon,
  Tag, SLATag, SLABar, formatMin, Card, Stat, PageHeader, Sparkline, LineChart
} from './components';
import { useAnalytics, useKbArticles, useCompanies, useUsers, useTickets, useLookups } from './hooks';
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

function KbArticleModal({ article, onClose, onSaved }) {
  const isEdit = !!article;
  const [title,    setTitle]    = useState(article?.title    ?? '');
  const [content,  setContent]  = useState(article?.content  ?? '');
  const [category, setCategory] = useState(article?.category ?? '');
  const [status,   setStatus]   = useState(article?.status   ?? 'Draft');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    setSaving(true); setError(null);
    try {
      if (isEdit) await api.put(`/kb-articles/${article.id}`, { title, content, category: category || null, status });
      else        await api.post('/kb-articles', { title, content, category: category || null, status });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed');
      setSaving(false);
    }
  }

  return (
    <AdminModal title={isEdit ? 'Edit article' : 'New KB article'} onClose={onClose} width={640}>
      <div className="col gap-4">
        <AdminField label="Title" required>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title…" autoFocus />
        </AdminField>
        <div className="grid-2" style={{ gap: 12 }}>
          <AdminField label="Category">
            <input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Billing, Auth…" />
          </AdminField>
          <AdminField label="Status">
            <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </AdminField>
        </div>
        <AdminField label="Content" required>
          <textarea className="textarea" value={content} onChange={e => setContent(e.target.value)}
            placeholder="Article body (markdown supported)…"
            style={{ minHeight: 200 }} />
        </AdminField>
        {error && <div style={{ fontSize: 12.5, color: 'var(--sla-breach)' }}>{error}</div>}
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create article'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function KbRowMenu({ article, onEdit, onReload }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onMD(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onMD);
    return () => document.removeEventListener('mousedown', onMD);
  }, [open]);

  async function setStatus(status) {
    setOpen(false);
    await api.put(`/kb-articles/${article.id}`, { status });
    onReload();
  }

  async function deleteArticle() {
    setConfirm(false);
    await api.delete(`/kb-articles/${article.id}`);
    onReload();
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn ghost icon" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <I.MoreH size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 160, zIndex: 100,
        }}>
          <div className="dropdown-item" onClick={() => { setOpen(false); onEdit(article); }}>
            <I.Edit size={13} /> Edit
          </div>
          {article.status !== 'Published' && (
            <div className="dropdown-item" style={{ color: 'var(--sla-ok)' }} onClick={() => setStatus('Published')}>
              <I.CheckCircle size={13} /> Publish
            </div>
          )}
          {article.status !== 'Archived' && (
            <div className="dropdown-item" onClick={() => setStatus('Archived')}>
              <I.Trash size={13} /> Archive
            </div>
          )}
          <div className="dropdown-item" style={{ color: 'var(--sla-breach)' }}
            onClick={() => { setOpen(false); setConfirm(true); }}>
            <I.Trash size={13} /> Delete
          </div>
        </div>
      )}
      {confirm && (
        <AdminModal title="Delete article?" onClose={() => setConfirm(false)} width={400}>
          <p style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 20 }}>
            This will permanently delete <strong>"{article.title}"</strong>.
          </p>
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn" style={{ background: 'var(--sla-breach)', color: '#fff', borderColor: 'var(--sla-breach)' }} onClick={deleteArticle}>Delete</button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

export function KnowledgeBase({ openTicket }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { articles, loading, reload } = useKbArticles(debouncedQ);

  const cats = [...new Set(articles.map((a) => a.category).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        subtitle="Solved issues, FAQs, and runbooks · searchable from any ticket"
        actions={
          <>
            <button className="btn"><I.Download size={14} /> Export</button>
            <button className="btn primary" onClick={() => setShowNew(true)}><I.Plus size={14} /> New article</button>
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
                      <td><KbRowMenu article={kb} onEdit={setEditing} onReload={reload} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>

      {showNew && <KbArticleModal onClose={() => setShowNew(false)} onSaved={reload} />}
      {editing  && <KbArticleModal article={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}

// ====================================================================
//   CLIENT PORTAL VIEW
// ====================================================================

// Friendly status labels shown to clients
const CLIENT_STATUS_LABELS = {
  New:                    { label: 'Submitted',         color: 'var(--status-new)' },
  Open:                   { label: 'In progress',       color: 'var(--status-open)' },
  WaitingClient:          { label: 'Awaiting your reply', color: 'var(--sla-warn)' },
  EscalatedDev:           { label: 'Under review',      color: 'var(--status-escalated)' },
  UnderReview:            { label: 'Under review',      color: 'var(--status-review)' },
  DeferredSprint:         { label: 'Scheduled',         color: 'var(--status-sprint)' },
  InDevelopment:          { label: 'Being fixed',       color: 'var(--status-dev)' },
  InQA:                   { label: 'Being tested',      color: 'var(--status-qa)' },
  ReadyDeploy:            { label: 'Fix ready',         color: 'var(--status-deploy)' },
  Deployed:               { label: 'Fix deployed',      color: 'var(--status-deployed)' },
  Resolved:               { label: 'Resolved',          color: 'var(--sla-ok)' },
  Closed:                 { label: 'Closed',            color: 'var(--text-muted)' },
};

function ClientStatusBadge({ status }) {
  const info = CLIENT_STATUS_LABELS[status] ?? { label: status, color: 'var(--text-muted)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999, fontSize: 11.5,
      background: `color-mix(in oklch, ${info.color} 12%, transparent)`,
      color: info.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: info.color, flexShrink: 0 }}></span>
      {info.label}
    </span>
  );
}

// CSAT star rating widget
function CsatWidget({ ticketId, existingScore, existingComment, onRated }) {
  const [hover, setHover]     = useState(0);
  const [selected, setSelected] = useState(existingScore ?? 0);
  const [comment, setComment] = useState(existingComment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(!!existingScore);

  async function handleSubmit(score) {
    setSubmitting(true);
    try {
      await api.post(`/tickets/${ticketId}/rate`, { csat_score: score, csat_comment: comment });
      setSelected(score);
      setSubmitted(true);
      if (onRated) onRated(score);
    } catch {}
    finally { setSubmitting(false); }
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You rated this</span>
        {[1,2,3,4,5].map(n => (
          <I.Star key={n} size={16} style={{ color: n <= selected ? '#f59e0b' : 'var(--border-strong)', fill: n <= selected ? '#f59e0b' : 'none' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>How did we do? Rate this ticket</div>
      <div className="row gap-1" style={{ marginBottom: 8 }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => !submitting && handleSubmit(n)}
            disabled={submitting}
          >
            <I.Star size={24} style={{
              color: n <= (hover || selected) ? '#f59e0b' : 'var(--border-strong)',
              fill:  n <= (hover || selected) ? '#f59e0b' : 'none',
              transition: 'color 0.1s',
            }} />
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8, alignSelf: 'center' }}>
          {hover ? ['','Terrible','Poor','Okay','Good','Excellent!'][hover] : 'Click to rate'}
        </span>
      </div>
      {selected > 0 && (
        <div>
          <textarea
            className="textarea"
            placeholder="Any additional feedback? (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ minHeight: 60, marginBottom: 8 }}
          />
          <button className="btn primary sm" onClick={() => handleSubmit(selected)} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit rating'}
          </button>
        </div>
      )}
    </div>
  );
}

// Client new ticket form
function ClientNewTicketForm({ onClose, onCreated }) {
  const { lookups, loading: lookupsLoading } = useLookups();
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [priorityId, setPriority] = useState(null);
  const [categoryId, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!lookups) return;
    if (!priorityId) {
      const med = lookups.priorities?.find(p => p.name === 'Medium');
      if (med) setPriority(med.id);
    }
    if (!categoryId && lookups.categories?.length) setCategory(String(lookups.categories[0].id));
  }, [lookups]);

  async function handleSubmit() {
    const local = {};
    if (!title.trim())       local.title = 'Subject is required';
    if (!description.trim()) local.description = 'Description is required';
    if (!priorityId)         local.priority_id = 'Priority is required';
    if (!categoryId)         local.category_id = 'Category is required';
    if (Object.keys(local).length) { setErrors(local); return; }

    // default channel to Web Form
    const webChannel = lookups?.channels?.find(c => c.name === 'Web Form') ?? lookups?.channels?.[0];

    setSubmitting(true);
    try {
      await api.post('/tickets', {
        title:             title.trim(),
        description:       description.trim(),
        priority_id:       priorityId,
        category_id:       parseInt(categoryId),
        intake_channel_id: webChannel?.id,
        contact_email:     '',
      });
      onCreated();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else setErrors({ general: data?.message ?? 'Failed to create ticket' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModal title="New support request" onClose={onClose} width={560}>
      <div className="col gap-3">
        <AdminField label="Subject" required>
          <input className="input" placeholder="Brief description of your issue" maxLength={255}
            value={title} onChange={e => setTitle(e.target.value)}
            style={errors.title ? { borderColor: 'var(--sla-breach)' } : {}} />
          {errors.title && <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 3 }}>{Array.isArray(errors.title) ? errors.title[0] : errors.title}</div>}
        </AdminField>
        <AdminField label="Description" required>
          <textarea className="textarea" placeholder="Please describe your issue in detail — what happened, what you expected, any steps to reproduce…"
            style={{ minHeight: 120, ...(errors.description ? { borderColor: 'var(--sla-breach)' } : {}) }}
            value={description} onChange={e => setDesc(e.target.value)} />
          {errors.description && <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 3 }}>{Array.isArray(errors.description) ? errors.description[0] : errors.description}</div>}
        </AdminField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <AdminField label="Category" required>
            <select className="select" value={categoryId} onChange={e => setCategory(e.target.value)} disabled={lookupsLoading}>
              {lookupsLoading ? <option>Loading…</option> : lookups?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Urgency" required>
            <select className="select" value={priorityId ?? ''} onChange={e => setPriority(parseInt(e.target.value))} disabled={lookupsLoading}>
              {lookupsLoading ? <option>Loading…</option> : lookups?.priorities?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </AdminField>
        </div>
        {errors.general && <div style={{ fontSize: 12, color: 'var(--sla-breach)' }}>{errors.general}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)' }}>
          <I.Mail size={11} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          You'll receive a confirmation with your ticket number. You can reply via email at any time.
        </div>
        <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn primary" onClick={handleSubmit} disabled={submitting || lookupsLoading}>
            <I.Send size={13} /> {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

export function ClientPortal({ openTicket }) {
  const { user } = useAuth();
  const companyId = user?.client_company_id ?? null;
  const [showNewForm, setShowNewForm] = useState(false);

  const params = useMemo(() => {
    if (!companyId) return {};
    return { company_id: companyId, per_page: 100 };
  }, [companyId]);

  const { tickets, loading, reload } = useTickets(params);

  const CLOSED = ['Resolved','Deployed','Closed'];
  const openCount     = tickets.filter(t => !CLOSED.includes(t.status)).length;
  const waitingCount  = tickets.filter(t => t.status === 'WaitingClient').length;
  const resolvedCount = tickets.filter(t => CLOSED.includes(t.status)).length;

  // separate open and closed tickets
  const openTickets   = tickets.filter(t => !CLOSED.includes(t.status));
  const closedTickets = tickets.filter(t => CLOSED.includes(t.status));

  return (
    <div>
      <PageHeader
        title="My support tickets"
        subtitle={user?.name ?? 'Client portal'}
        actions={
          <button className="btn primary" onClick={() => setShowNewForm(true)}>
            <I.Plus size={14} /> New request
          </button>
        }
      />
      <div className="page-content" style={{ maxWidth: 960 }}>
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <Stat label="Open"              value={loading ? '…' : openCount}     icon={<I.Clock size={13} />} />
          <Stat label="Awaiting your reply" value={loading ? '…' : waitingCount} icon={<I.MessageSquare size={13} />} valueColor="var(--sla-warn)" />
          <Stat label="Resolved (all time)" value={loading ? '…' : resolvedCount} icon={<I.CheckCircle size={13} />} valueColor="var(--sla-ok)" />
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 6 }}>No tickets yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Submit a request and our team will be in touch.</div>
            <button className="btn primary" onClick={() => setShowNewForm(true)}><I.Plus size={14} /> Submit your first request</button>
          </div>
        ) : (
          <div className="col gap-4">
            {openTickets.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Active</div>
                <div className="col gap-3">
                  {openTickets.map(t => <ClientTicketCard key={t.id} t={t} openTicket={openTicket} onRated={reload} />)}
                </div>
              </div>
            )}
            {closedTickets.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Resolved</div>
                <div className="col gap-3">
                  {closedTickets.map(t => <ClientTicketCard key={t.id} t={t} openTicket={openTicket} onRated={reload} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewForm && (
        <ClientNewTicketForm
          onClose={() => setShowNewForm(false)}
          onCreated={() => { setShowNewForm(false); reload(); }}
        />
      )}
    </div>
  );
}

function ClientTicketCard({ t, openTicket, onRated }) {
  const CLOSED = ['Resolved','Deployed','Closed'];
  const isClosed = CLOSED.includes(t.status);
  const needsRating = isClosed && !t.csat_score;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row gap-3" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.ticket_id}</span>
        <ClientStatusBadge status={t.status} />
        {t.priority && <PriorityBadge priority={t.priority} />}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)' }} className="mono">
          {formatMin(t.createdMinAgo)} ago
        </span>
      </div>
      <div
        style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 6, cursor: 'pointer' }}
        onClick={() => openTicket(t.id)}
      >
        {t.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
        {(t.description ?? '').slice(0, 180)}{(t.description?.length ?? 0) > 180 ? '…' : ''}
      </div>
      <div className="row gap-3" style={{ paddingTop: 12, borderTop: '1px solid var(--divider)', fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        {t.csr && <span><I.User size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Handled by {t.csr.name}</span>}
        <span><I.MessageSquare size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t.commentCount ?? 0} replies</span>
        <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => openTicket(t.id)}>
          View ticket <I.ChevronRight size={12} />
        </button>
      </div>
      {needsRating && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
          <CsatWidget ticketId={t.id} onRated={onRated} />
        </div>
      )}
      {isClosed && t.csat_score && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
          <CsatWidget ticketId={t.id} existingScore={t.csat_score} existingComment={t.csat_comment} />
        </div>
      )}
    </div>
  );
}

// ====================================================================
//   COMPANIES / USERS / AUDIT (admin)
// ====================================================================
function CompanyModal({ company, onClose, onSaved }) {
  const isEdit = !!company;
  const [name,  setName]  = useState(company?.name          ?? '');
  const [email, setEmail] = useState(company?.primary_email ?? '');
  const [phone, setPhone] = useState(company?.phone         ?? '');
  const [isVip, setIsVip] = useState(company?.is_vip        ?? false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) { setError('Company name is required'); return; }
    setSaving(true); setError(null);
    try {
      if (isEdit) await api.put(`/companies/${company.id}`, { name, primary_email: email || null, phone: phone || null, is_vip: isVip });
      else        await api.post('/companies', { name, primary_email: email || null, phone: phone || null, is_vip: isVip });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed');
      setSaving(false);
    }
  }

  return (
    <AdminModal title={isEdit ? 'Edit company' : 'Add company'} onClose={onClose}>
      <div className="col gap-4">
        <AdminField label="Company name" required>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
        </AdminField>
        <AdminField label="Primary email">
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@acme.com" />
        </AdminField>
        <AdminField label="Phone">
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
        </AdminField>
        <label className="row gap-2" style={{ fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={isVip} onChange={e => setIsVip(e.target.checked)} />
          VIP account (priority support)
        </label>
        {error && <div style={{ fontSize: 12.5, color: 'var(--sla-breach)' }}>{error}</div>}
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add company'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function CompanyRowMenu({ company, onEdit, onReload }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onMD(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onMD);
    return () => document.removeEventListener('mousedown', onMD);
  }, [open]);

  async function deleteCompany() {
    setConfirm(false);
    await api.delete(`/companies/${company.id}`);
    onReload();
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn ghost icon" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <I.MoreH size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 150, zIndex: 100,
        }}>
          <div className="dropdown-item" onClick={() => { setOpen(false); onEdit(company); }}>
            <I.Edit size={13} /> Edit
          </div>
          <div className="dropdown-item" style={{ color: 'var(--sla-breach)' }}
            onClick={() => { setOpen(false); setConfirm(true); }}>
            <I.Trash size={13} /> Delete
          </div>
        </div>
      )}
      {confirm && (
        <AdminModal title="Delete company?" onClose={() => setConfirm(false)} width={400}>
          <p style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 20 }}>
            Delete <strong>{company.name}</strong>? This cannot be undone.
          </p>
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn" style={{ background: 'var(--sla-breach)', color: '#fff', borderColor: 'var(--sla-breach)' }} onClick={deleteCompany}>Delete</button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

export function CompaniesView() {
  const { companies, loading, error, reload } = useCompanies();
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      <PageHeader
        title="Client companies"
        subtitle={loading ? 'Loading…' : `${companies.length} companies · ${companies.filter((c) => c.is_vip).length} VIP`}
        actions={
          <>
            <button className="btn" onClick={reload} disabled={loading}><I.Refresh size={14} /> Refresh</button>
            <button className="btn primary" onClick={() => setShowNew(true)}><I.Plus size={14} /> Add company</button>
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
                      <td><CompanyRowMenu company={c} onEdit={setEditing} onReload={reload} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showNew && <CompanyModal onClose={() => setShowNew(false)} onSaved={reload} />}
      {editing  && <CompanyModal company={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}

// ---- admin modal shell ----
function AdminModal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width, maxWidth: '95vw',
        boxShadow: '0 24px 48px rgba(0,0,0,0.25)', padding: 24,
      }} onClick={e => e.stopPropagation()}>
        <div className="row gap-2" style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
          <button className="btn ghost icon" style={{ marginLeft: 'auto' }} onClick={onClose}><I.X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdminField({ label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--sla-breach)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ---- user 3-dot menu ----
function UserRowMenu({ user, onEdit, onToggleActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onMD(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onMD);
    return () => document.removeEventListener('mousedown', onMD);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn ghost icon" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <I.MoreH size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 160, zIndex: 100,
        }}>
          <div className="dropdown-item" onClick={() => { setOpen(false); onEdit(user); }}>
            <I.Edit size={13} /> Edit user
          </div>
          <div
            className="dropdown-item"
            style={{ color: user.is_active ? 'var(--sla-breach)' : 'var(--sla-ok)' }}
            onClick={() => { setOpen(false); onToggleActive(user); }}
          >
            {user.is_active ? <><I.X size={13} /> Deactivate</> : <><I.Check size={13} /> Reactivate</>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- user invite / edit modal ----
function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [name, setName]         = useState(user?.name ?? '');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState(user?.role ?? 'CSR');
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});

  const ALL_ROLES = ['SuperAdmin','Admin','Manager','Supervisor','CSR','Bridge','Developer','QA','Client'];

  async function handleSave() {
    const local = {};
    if (!name.trim())  local.name = 'Name is required';
    if (!email.trim()) local.email = 'Email is required';
    if (!isEdit && !password.trim()) local.password = 'Password is required';
    if (Object.keys(local).length) { setErrors(local); return; }

    setSaving(true);
    setErrors({});
    try {
      const payload = { name, email, role };
      if (password) payload.password = password;
      if (isEdit) {
        await api.patch(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', { ...payload, password });
      }
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else setErrors({ general: data?.message ?? 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={isEdit ? 'Edit user' : 'Invite user'} onClose={onClose}>
      <div className="col gap-3">
        <AdminField label="Full name" required>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
          {errors.name && <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 3 }}>{Array.isArray(errors.name) ? errors.name[0] : errors.name}</div>}
        </AdminField>
        <AdminField label="Email address" required>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          {errors.email && <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 3 }}>{Array.isArray(errors.email) ? errors.email[0] : errors.email}</div>}
        </AdminField>
        <AdminField label={isEdit ? 'New password (leave blank to keep)' : 'Password'} required={!isEdit}>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? 'Leave blank to keep current…' : 'Min 8 characters'} />
          {errors.password && <div style={{ fontSize: 11.5, color: 'var(--sla-breach)', marginTop: 3 }}>{Array.isArray(errors.password) ? errors.password[0] : errors.password}</div>}
        </AdminField>
        <AdminField label="Role" required>
          <select className="select" value={role} onChange={e => setRole(e.target.value)}>
            {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </AdminField>
        {errors.general && <div style={{ fontSize: 12, color: 'var(--sla-breach)' }}>{errors.general}</div>}
        <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

// ---- role colour map ----
const ROLE_COLORS = {
  SuperAdmin: 'oklch(0.45 0.22 300)',
  Admin:      'var(--accent)',
  Manager:    'oklch(0.45 0.18 240)',
  Supervisor: 'oklch(0.45 0.18 200)',
  CSR:        'oklch(0.45 0.14 140)',
  Bridge:     'oklch(0.55 0.18 70)',
  Developer:  'oklch(0.45 0.2 250)',
  QA:         'oklch(0.45 0.18 160)',
  Client:     'var(--text-muted)',
};

export function UsersView() {
  const { users, loading, reload } = useUsers();
  const [modal, setModal]         = useState(null); // null | 'new' | user obj
  const [filterRole, setFilterRole] = useState('');

  const ROLE_STATS = [
    { role: 'SuperAdmin', icon: <I.Shield size={13} /> },
    { role: 'Admin',      icon: <I.Settings size={13} /> },
    { role: 'Manager',    icon: <I.BarChart size={13} /> },
    { role: 'Supervisor', icon: <I.Eye size={13} /> },
    { role: 'CSR',        icon: <I.User size={13} /> },
    { role: 'Bridge',     icon: <I.GitBranch size={13} /> },
    { role: 'Developer',  icon: <I.Code size={13} /> },
    { role: 'QA',         icon: <I.CheckCircle size={13} /> },
  ];

  const byRole = useMemo(() => {
    const counts = {};
    for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;
    return counts;
  }, [users]);

  const filtered = filterRole ? users.filter(u => u.role === filterRole) : users;

  async function toggleActive(u) {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      reload();
    } catch {}
  }

  return (
    <div>
      <PageHeader
        title="Users & roles"
        subtitle={`${users.filter(u => u.is_active).length} active · ${users.filter(u => !u.is_active).length} inactive`}
        actions={<>
          <button className="btn primary" onClick={() => setModal('new')}><I.Plus size={14} /> Invite user</button>
        </>}
      />
      <div className="page-content">
        {/* Role stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 20 }}>
          {ROLE_STATS.map((r) => (
            <div
              key={r.role}
              className="stat-card"
              style={{
                cursor: 'pointer',
                outline: filterRole === r.role ? '2px solid var(--accent)' : 'none',
              }}
              onClick={() => setFilterRole(f => f === r.role ? '' : r.role)}
            >
              <div className="stat-label" style={{ color: ROLE_COLORS[r.role] }}>
                {r.icon}<span>{r.role}</span>
              </div>
              <div className="stat-value">{loading ? '…' : byRole[r.role] ?? 0}</div>
            </div>
          ))}
        </div>

        <Card action={
          filterRole ? (
            <button className="btn ghost sm" onClick={() => setFilterRole('')}>
              <I.X size={11} /> Clear filter
            </button>
          ) : null
        }>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No users found</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Active tickets</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td>
                      <div className="row gap-2">
                        <Avatar user={{ initials: u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), color: ROLE_COLORS[u.role] ?? 'var(--accent)' }} />
                        <div className="col" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }} className="mono">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: `color-mix(in oklch, ${ROLE_COLORS[u.role] ?? 'var(--accent)'} 12%, transparent)`,
                        color: ROLE_COLORS[u.role] ?? 'var(--accent)',
                        border: 0,
                      }}>{u.role}</span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="row gap-1" style={{ fontSize: 12 }}>
                          <span className="live-dot"></span>Active
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Inactive</span>
                      )}
                    </td>
                    <td className="mono">{u.active_tickets_count ?? 0}</td>
                    <td>
                      <UserRowMenu
                        user={u}
                        onEdit={(usr) => setModal(usr)}
                        onToggleActive={toggleActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

export function AuditLog() {
  const [filterQ, setFilterQ] = useState('');

  const allItems = [
    { action: "ticket.status_changed", actor: "Bridge", role: "Bridge", details: "Status: Open → Escalated to Dev", ticket: "SUP-2026-0514-018", minAgo: 22 },
    { action: "comment.added", actor: "CSR", role: "CSR", details: "Client-facing reply sent", ticket: "SUP-2026-0514-018", minAgo: 56 },
    { action: "ticket.priority_changed", actor: "CSR", role: "CSR", details: "Priority: High → Critical", ticket: "SUP-2026-0514-018", minAgo: 76 },
    { action: "ticket.created", actor: "Client", role: "Client", details: "Created via Email channel", ticket: "SUP-2026-0514-018", minAgo: 78 },
    { action: "user.login", actor: "Admin", role: "Admin", details: "IP 203.0.113.42, Chrome 124 on macOS", ticket: null, minAgo: 90 },
    { action: "sla.breach", actor: "STMS", role: "System", details: "First response SLA breached (target 60m)", ticket: "SUP-2026-0514-018", minAgo: 18 },
    { action: "csat.recorded", actor: "Client", role: "Client", details: "5 stars — 'Quick and clear, thanks'", ticket: "SUP-2026-0514-012", minAgo: 320 },
  ];

  const lq = filterQ.toLowerCase();
  const items = filterQ
    ? allItems.filter(it =>
        it.action.includes(lq) || it.actor.toLowerCase().includes(lq) ||
        it.role.toLowerCase().includes(lq) || it.details.toLowerCase().includes(lq) ||
        (it.ticket && it.ticket.toLowerCase().includes(lq))
      )
    : allItems;

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
            <input className="input" placeholder="Filter by action, actor, or ticket…" style={{ width: 260 }}
              value={filterQ} onChange={e => setFilterQ(e.target.value)} />
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
              {items.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>No matching entries</td></tr>
              ) : items.map((it, i) => (
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
