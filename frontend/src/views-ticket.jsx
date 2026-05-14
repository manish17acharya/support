import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DATA } from './data';
import * as I from './icons';
import {
  Avatar, StatusPill, PriorityBadge, ChannelIcon, CategoryIcon,
  Tag, SLATag, SLABar, formatMin, Card
} from './components';
import { useTicket, useLookups, useUsers } from './hooks';
import api from './api';

// ====================================================================
//   TICKET DETAIL — centerpiece
// ====================================================================
export function TicketDetail({ ticketId, back }) {
  const { ticket: t, loading, error, reload } = useTicket(ticketId);
  const { lookups } = useLookups();
  const [tab, setTab] = useState("conversation");
  const [replyMode, setReplyMode] = useState("client");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState(null);

  // DB status name → { id, name } lookup
  const statusMap = useMemo(() => {
    const m = {};
    for (const s of lookups?.statuses ?? []) m[s.name] = s;
    return m;
  }, [lookups]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>
      Loading ticket…
    </div>
  );
  if (error || !t) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{error || "Ticket not found"}</span>
      <button className="btn sm" onClick={back}><I.ChevronLeft size={13} /> Back</button>
    </div>
  );

  const csr    = t.csr;
  const bridge = t.bridge;
  const dev    = t.dev;
  const qa     = t.qa;
  const company = null;

  return (
    <div className="ticket-detail-shell">
      {/* Ticket header — sticky */}
      <div style={{
        padding: "14px 24px",
        background: "var(--bg)",
        borderBottom: "1px solid var(--divider)",
      }}>
        <div className="row gap-3" style={{ marginBottom: 8 }}>
          <button className="btn ghost sm" onClick={back}>
            <I.ChevronLeft size={14} /> Tickets
          </button>
          <span style={{ color: "var(--text-faint)" }}>/</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.ticket_id}</span>
          <button className="btn ghost sm" style={{ padding: "2px 6px" }} title="Copy ID"><I.Code size={12} /></button>
          <div className="row gap-2" style={{ marginLeft: "auto" }}>
            <button className="btn sm"><I.Bookmark size={12} /> Watch <span style={{ color: "var(--text-muted)" }}>· {t.watchers}</span></button>
            <button className="btn sm"><I.ExternalLink size={12} /> Share</button>
            <button className="btn ghost icon"><I.MoreH size={14} /></button>
          </div>
        </div>

        <div className="row gap-3" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: 20, fontWeight: 600, color: "var(--text-strong)",
              margin: 0, marginBottom: 8, letterSpacing: "-0.01em", lineHeight: 1.25
            }}>{t.title}</h1>
            <div className="row gap-3" style={{ flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <button className="btn sm" onClick={() => setStatusOpen(!statusOpen)}>
                  <StatusPill status={t.status} />
                  <I.ChevronDown size={12} />
                </button>
                {statusOpen && (
                  <StatusDropdown
                    current={t.status}
                    ticketId={t.id}
                    statusMap={statusMap}
                    reload={reload}
                    onClose={() => setStatusOpen(false)}
                  />
                )}
              </div>
              <PriorityBadge priority={t.priority} />
              <span className="row gap-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <CategoryIcon category={t.category} size={12} /> {t.category}
              </span>
              <span className="row gap-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <ChannelIcon channel={t.channel} size={12} /> {t.channel}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Opened {formatMin(t.createdMinAgo)} ago by {t.raisedByCsr ? csr?.name + " (on behalf)" : t.contact}
              </span>
              {t.tags && t.tags.length ? (
                <div className="row gap-1">
                  {t.tags.map((tag) => <Tag key={tag} name={tag} />)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Body grid: conversation | sidebar */}
      <div className="ticket-detail-body">
        {/* Conversation pane */}
        <div style={{ overflow: "auto", padding: "16px 24px 24px", borderRight: "1px solid var(--divider)" }}>
          {/* SLA banner */}
          <SLABanner t={t} />

          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={"tab" + (tab === "conversation" ? " active" : "")} onClick={() => setTab("conversation")}>
              <I.MessageSquare size={13} /> Conversation <span className="count">{t.commentCount}</span>
            </button>
            <button className={"tab" + (tab === "activity" ? " active" : "")} onClick={() => setTab("activity")}>
              <I.Activity size={13} /> Activity
            </button>
            <button className={"tab" + (tab === "attachments" ? " active" : "")} onClick={() => setTab("attachments")}>
              <I.Paperclip size={13} /> Attachments <span className="count">{t.attachmentCount}</span>
            </button>
            <button className={"tab" + (tab === "email" ? " active" : "")} onClick={() => setTab("email")}>
              <I.Mail size={13} /> Email thread
            </button>
            <button className={"tab" + (tab === "linked" ? " active" : "")} onClick={() => setTab("linked")}>
              <I.GitBranch size={13} /> Linked work
            </button>
          </div>

          {tab === "conversation" ? <ConversationTab t={t}
            replyMode={replyMode} setReplyMode={setReplyMode}
            replyText={replyText} setReplyText={setReplyText}
            onSend={async () => {
              if (!replyText.trim()) return;
              setSending(true);
              try {
                await api.post(`/tickets/${t.id}/comments`, {
                  content: replyText.trim(),
                  comment_type: replyMode === 'internal' ? 'Internal_Note' : 'Client_Facing',
                  channel: replyMode === 'internal' ? 'Internal' : 'Portal',
                });
                setReplyText('');
                reload();
              } finally {
                setSending(false);
              }
            }}
            sending={sending}
          /> : null}
          {tab === "activity"     ? <ActivityTab t={t} /> : null}
          {tab === "attachments"  ? <AttachmentsTab t={t} /> : null}
          {tab === "email"        ? <EmailThreadTab t={t} /> : null}
          {tab === "linked"       ? <LinkedWorkTab t={t} /> : null}
        </div>

        {/* Right sidebar */}
        <TicketSidebar
          t={t} csr={csr} bridge={bridge} dev={dev} qa={qa} company={company}
          ticketId={t.id} statusMap={statusMap} reload={reload}
          assigningRole={assigningRole} setAssigningRole={setAssigningRole}
          onResolve={() => setShowResolveModal(true)}
        />
      </div>

      {showResolveModal && (
        <ResolveModal t={t} statusMap={statusMap} reload={reload} onClose={() => setShowResolveModal(false)} />
      )}
    </div>
  );
}

// === SLA banner =======================================================
function SLABanner({ t }) {
  const res = t.slaResolution;
  const pct = (res.elapsed / res.target) * 100;
  let kind = "ok";
  if (res.breached || pct >= 100) kind = "breach";
  else if (pct >= 75) kind = "warn";

  const colorVar = kind === "breach" ? "var(--sla-breach)" : kind === "warn" ? "var(--sla-warn)" : "var(--sla-ok)";
  const message = res.paused
    ? "SLA paused while waiting for client response."
    : kind === "breach"
      ? `Resolution SLA breached by ${formatMin(res.elapsed - res.target)}. Manager notified.`
      : kind === "warn"
        ? `Resolution SLA approaching — ${formatMin(res.target - res.elapsed)} remaining.`
        : `On track — ${formatMin(res.target - res.elapsed)} remaining for resolution.`;

  return (
    <div style={{
      padding: "12px 14px",
      background: `color-mix(in oklch, ${colorVar} 8%, transparent)`,
      border: `1px solid color-mix(in oklch, ${colorVar} 25%, transparent)`,
      borderRadius: "var(--radius-lg)",
      marginBottom: 16
    }}>
      <div className="row gap-3" style={{ marginBottom: 8 }}>
        <span style={{ color: colorVar, display: "inline-flex" }}>
          {kind === "breach" ? <I.Alert size={16} /> : kind === "warn" ? <I.Clock size={16} /> : res.paused ? <I.Pause size={16} /> : <I.CheckCircle size={16} />}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>{message}</span>
        <div className="row gap-2" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }} className="mono">
          <span className="mono">{formatMin(res.elapsed)} / {formatMin(res.target)}</span>
        </div>
      </div>
      <div className="grid-2" style={{ gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }} className="row gap-2">
            <span>First response</span>
            <span style={{ marginLeft: "auto" }}>{formatMin(t.firstResponseMin || 0)} / {formatMin(t.slaResponse.target)}</span>
          </div>
          <SLABar sla={t.slaResponse} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }} className="row gap-2">
            <span>Resolution</span>
            <span style={{ marginLeft: "auto" }}>{formatMin(res.elapsed)} / {formatMin(res.target)}</span>
          </div>
          <SLABar sla={res} />
        </div>
      </div>
    </div>
  );
}

// === Conversation tab =================================================
function ConversationTab({ t, replyMode, setReplyMode, replyText, setReplyText, onSend, sending }) {
  const comments = t.comments ?? [];

  return (
    <div className="col gap-3">
      {/* Description card */}
      <div className="card" style={{ padding: 16, marginBottom: 8 }}>
        <div className="row gap-2" style={{ marginBottom: 8, fontSize: 11, color: "var(--text-muted)" }}>
          <I.FileText size={12} /><span>ORIGINAL REQUEST</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text)" }}>
          {t.description}
        </div>
      </div>

      {/* Comments */}
      {comments.map((c) => <CommentBlock key={c.id} c={c} />)}
      {comments.length === 0 && (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
          No replies yet
        </div>
      )}

      {/* Reply composer */}
      <div style={{ marginTop: 8 }}>
        <ReplyComposer
          replyMode={replyMode} setReplyMode={setReplyMode}
          replyText={replyText} setReplyText={setReplyText}
          contact={t.contact} contactEmail={t.contactEmail}
          onSend={onSend} sending={sending}
        />
      </div>
    </div>
  );
}

function CommentBlock({ c }) {
  const isSystem = c.type === "System";
  const isInternal = c.type === "Internal_Note";
  const isClient = c.authorRole === "Client";

  if (isSystem) {
    return (
      <div className="row gap-2" style={{
        padding: "6px 12px",
        fontSize: 12, color: "var(--text-muted)",
        background: "var(--bg-sunken)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--divider)",
      }}>
        <I.Settings size={12} />
        <span>{c.body}</span>
        <span style={{ marginLeft: "auto" }} className="mono">{formatMin(c.minAgo)} ago</span>
      </div>
    );
  }

  return (
    <div className={"comment" + (isInternal ? " internal" : "")}>
      <div className="comment-head">
        <Avatar user={{ initials: c.authorName.split(" ").map((s) => s[0]).join("").slice(0, 2), color: isClient ? "oklch(0.55 0.18 50)" : "var(--accent)" }} />
        <div className="col" style={{ gap: 0 }}>
          <div className="row gap-2">
            <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 13 }}>{c.authorName}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "1px 6px", border: "1px solid var(--border)", borderRadius: 4 }}>
              {c.authorRole}
            </span>
            {isInternal ? (
              <span style={{
                fontSize: 11, color: "oklch(0.50 0.16 80)",
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "1px 6px",
                background: "color-mix(in oklch, oklch(0.8 0.16 80) 20%, transparent)",
                borderRadius: 4
              }}>
                <I.Lock size={10} /> Internal note
              </span>
            ) : (
              <span style={{
                fontSize: 11, color: "var(--accent)",
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "1px 6px", background: "var(--accent-soft)",
                borderRadius: 4
              }}>
                {c.direction === "in" ? <><I.Mail size={10} /> via Email</> : <><I.Send size={10} /> Sent to client</>}
              </span>
            )}
          </div>
        </div>
        <div className="row gap-2" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-faint)" }}>
          <span className="mono">{formatMin(c.minAgo)} ago</span>
          <button className="btn ghost icon" style={{ padding: 3 }}><I.MoreH size={12} /></button>
        </div>
      </div>
      <div className="comment-body">
        {c.body.split("\n").map((line, i) => <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "0 0 8px" }}>{line || " "}</p>)}
        {c.attachments ? (
          <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 8 }}>
            {c.attachments.map((a) => (
              <div key={a.name} className="row gap-2" style={{
                padding: "6px 10px", background: "var(--bg-sunken)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                fontSize: 12, cursor: "pointer"
              }}>
                <I.Paperclip size={12} />
                <span style={{ color: "var(--text)" }}>{a.name}</span>
                <span style={{ color: "var(--text-muted)" }} className="mono">{a.size}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReplyComposer({ replyMode, setReplyMode, replyText, setReplyText, contact, contactEmail, onSend, sending }) {
  const isInternal = replyMode === "internal";
  return (
    <div className="card" style={{
      background: isInternal ? "color-mix(in oklch, oklch(0.95 0.06 80) 70%, var(--panel))" : "var(--panel)",
      borderColor: isInternal ? "color-mix(in oklch, oklch(0.8 0.12 80) 40%, var(--border))" : "var(--border)"
    }}>
      {/* Mode tabs */}
      <div className="row gap-1" style={{
        padding: "8px 8px 0",
        borderBottom: "1px solid var(--divider)"
      }}>
        <button
          className="tab"
          style={{
            borderBottomColor: !isInternal ? "var(--accent)" : "transparent",
            color: !isInternal ? "var(--text-strong)" : "var(--text-muted)",
            fontSize: 12.5, padding: "8px 12px"
          }}
          onClick={() => setReplyMode("client")}
        >
          <I.Send size={13} /> Reply to client
        </button>
        <button
          className="tab"
          style={{
            borderBottomColor: isInternal ? "oklch(0.65 0.16 80)" : "transparent",
            color: isInternal ? "oklch(0.45 0.16 80)" : "var(--text-muted)",
            fontSize: 12.5, padding: "8px 12px"
          }}
          onClick={() => setReplyMode("internal")}
        >
          <I.Lock size={13} /> Internal note
        </button>
        <div className="row gap-2" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>
          {!isInternal ? <>
            <span>To:</span>
            <span className="mono" style={{ color: "var(--text)" }}>{contactEmail}</span>
          </> : <>
            <I.Lock size={11} />
            <span>Visible to staff only — not sent to client</span>
          </>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="row gap-1" style={{ padding: "8px 12px", borderBottom: "1px solid var(--divider)" }}>
        <button className="btn ghost icon sm" style={{ padding: 4 }} title="Bold"><strong style={{ fontFamily: "var(--font-mono)" }}>B</strong></button>
        <button className="btn ghost icon sm" style={{ padding: 4 }} title="Italic"><em style={{ fontFamily: "var(--font-mono)" }}>I</em></button>
        <button className="btn ghost icon sm" style={{ padding: 4 }} title="Code"><I.Code size={12} /></button>
        <span style={{ width: 1, height: 16, background: "var(--divider)", margin: "0 4px" }}></span>
        <button className="btn ghost icon sm" style={{ padding: 4 }} title="KB"><I.BookOpen size={12} /></button>
        <button className="btn ghost icon sm" style={{ padding: 4 }} title="Attach"><I.Paperclip size={12} /></button>
        <button className="btn ghost sm" style={{ padding: "3px 8px", fontSize: 12 }}>
          <I.FileText size={12} /> Templates
        </button>
        <div style={{ flex: 1 }}></div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {replyText.length} chars
        </span>
      </div>

      <textarea
        className="textarea"
        placeholder={isInternal
          ? "Add an internal note — only visible to staff…"
          : `Reply to ${contact}…`}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        style={{
          border: 0, borderRadius: 0, padding: 14,
          background: "transparent", minHeight: 110,
          outline: "none", boxShadow: "none"
        }}
      ></textarea>

      <div className="row gap-2" style={{ padding: "10px 12px", borderTop: "1px solid var(--divider)" }}>
        {!isInternal ? (
          <>
            <select className="select" style={{ width: "auto", padding: "4px 10px", fontSize: 12.5 }}>
              <option>Status: keep as Open</option>
              <option>Set status: Waiting for client</option>
              <option>Set status: Resolved</option>
            </select>
            <label className="row gap-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <input type="checkbox" defaultChecked /> CC supervisor
            </label>
          </>
        ) : (
          <>
            <button className="btn sm"><I.User size={12} /> @mention</button>
            <button className="btn sm"><I.Bell size={12} /> Notify watchers</button>
          </>
        )}
        <div style={{ flex: 1 }}></div>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
          <span className="kbd">⌘</span> <span className="kbd">↵</span> to send
        </span>
        <button className="btn primary" disabled={sending || !replyText.trim()} onClick={onSend} style={{
          background: isInternal ? "oklch(0.55 0.16 80)" : "var(--accent)",
          borderColor: isInternal ? "oklch(0.55 0.16 80)" : "var(--accent)"
        }}>
          {sending ? "Sending…" : isInternal ? <><I.Lock size={13} /> Post note</> : <><I.Send size={13} /> Send reply</>}
        </button>
      </div>
    </div>
  );
}

// === Status dropdown ==================================================
function StatusDropdown({ current, ticketId, statusMap, reload, onClose }) {
  const [changing, setChanging] = useState(null); // statusKey being changed to
  const ref = useRef(null);

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const groups = [
    { title: "CSR (Tier 1)", items: ["Open", "WaitingClient", "Resolved"] },
    { title: "Escalation",   items: ["EscalatedDev", "UnderReview", "DeferredSprint"] },
    { title: "Development",  items: ["InDevelopment", "InQA", "ReadyDeploy", "Deployed"] },
    { title: "Final",        items: ["Closed", "Reopened"] },
  ];

  async function pick(statusKey) {
    if (statusKey === current || changing) return;
    const dbName = DATA.STATUSES[statusKey]?.name;
    const status = statusMap[dbName];
    if (!status) { onClose(); return; }
    setChanging(statusKey);
    try {
      await api.patch(`/tickets/${ticketId}/status`, { status_id: status.id });
      reload();
    } finally {
      setChanging(null);
      onClose();
    }
  }

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 6px)", left: 0,
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
      padding: 6, width: 260, zIndex: 20
    }}>
      {groups.map((g) => (
        <div key={g.title}>
          <div style={{ fontSize: 10.5, color: "var(--text-faint)", padding: "8px 10px 4px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {g.title}
          </div>
          {g.items.map((s) => (
            <div key={s}
              onClick={() => pick(s)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px", borderRadius: "var(--radius-md)",
                cursor: changing ? "wait" : "pointer",
                background: current === s ? "var(--accent-soft)" : "transparent",
                opacity: changing && changing !== s ? 0.5 : 1,
              }}>
              <StatusPill status={s} />
              {current === s && <I.Check size={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
              {changing === s && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>Saving…</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// === Activity tab =====================================================
function ActivityTab({ t }) {
  const items = t.statusHistory ?? [];

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        No status history yet
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="timeline">
        {items.map((it, i) => (
          <div key={it.id ?? i} className="timeline-item">
            <div className="timeline-icon"><I.Refresh size={12} /></div>
            <div className="row gap-2">
              <span style={{ fontSize: 13, color: "var(--text)" }}>{it.text}</span>
              {it.actor ? <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>· {it.actor}</span> : null}
              {it.note ? <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: 'italic' }}>"{it.note}"</span> : null}
              <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }} className="mono">{formatMin(it.minAgo)} ago</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttachmentsTab({ t }) {
  const items = [
    { name: "checkout-failure.har",  size: "1.4 MB", who: "Elena Rivera", min: 78 },
    { name: "screenshot-1.png",      size: "284 KB", who: "Elena Rivera", min: 78 },
    { name: "screenshot-2.png",      size: "302 KB", who: "Elena Rivera", min: 78 },
    { name: "gateway-logs.txt",      size: "84 KB",  who: "Aisha Patel",   min: 56 },
    { name: "paypal-cert-rotation-runbook.pdf", size: "920 KB", who: "James Okonkwo", min: 22 },
  ];
  return (
    <div className="card">
      <div style={{ padding: 12 }}>
        {items.map((a) => (
          <div key={a.name} className="row gap-3" style={{
            padding: "10px 8px", borderBottom: "1px solid var(--divider)"
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: "var(--bg-sunken)", display: "grid", placeItems: "center",
              color: "var(--text-muted)"
            }}><I.FileText size={14} /></div>
            <div className="col" style={{ gap: 2, flex: 1 }}>
              <span style={{ fontSize: 13, color: "var(--text-strong)" }}>{a.name}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{a.size} · uploaded by {a.who} · {formatMin(a.min)} ago</span>
            </div>
            <button className="btn sm"><I.Download size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailThreadTab({ t }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
        Threaded by <span className="mono" style={{ color: "var(--text)" }}>[Ticket #{t.ticket_id}]</span> in subject line. Replies are auto-ingested.
      </div>
      {[
        { subj: `[Ticket #${t.ticket_id}] Your Support Request Has Been Received`, dir: "Outbound", from: "support@helpdesk.co", to: t.contactEmail, min: 78 },
        { subj: `Re: [Ticket #${t.ticket_id}] Your Support Request Has Been Received`, dir: "Inbound", from: t.contactEmail, to: "support@helpdesk.co", min: 78 },
        { subj: `[Ticket #${t.ticket_id}] Workaround available while we investigate`, dir: "Outbound", from: "aisha.patel@helpdesk.co", to: t.contactEmail, min: 56 },
      ].map((e, i) => (
        <div key={i} style={{
          padding: 12, marginBottom: 8,
          border: "1px solid var(--divider)", borderRadius: "var(--radius-md)",
          background: e.dir === "Inbound" ? "var(--bg-sunken)" : "var(--panel)"
        }}>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <span className="badge" style={{ fontSize: 10.5 }}>{e.dir}</span>
            <span style={{ fontSize: 13, color: "var(--text-strong)" }} className="truncate">{e.subj}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{formatMin(e.min)} ago</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }} className="mono">
            {e.from} → {e.to}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkedWorkTab({ t }) {
  return (
    <div className="col gap-3">
      <div className="card" style={{ padding: 14 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <I.GitBranch size={14} />
          <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>Linked development task</span>
        </div>
        <div className="row gap-3" style={{
          padding: 10, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-sunken)"
        }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>DEV-2841</span>
          <span style={{ fontSize: 13, flex: 1 }} className="truncate">Fix PayPal IPN timeout after TLS rotation</span>
          <span className="status-pill" style={{ "--status-color": "var(--status-dev)" }}><span className="dot"></span>In Progress</span>
          <span className="badge"><Avatar user={DATA.USERS[5]} size="sm" /> Leo Kowalski</span>
          <button className="btn sm ghost"><I.ExternalLink size={12} /></button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          Status changes in DEV-2841 will auto-propagate here: <span className="mono">In Dev → In QA → Ready → Deployed</span>.
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <I.Layers size={14} />
          <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>Sprint</span>
        </div>
        <div className="row gap-3">
          <span className="badge" style={{ fontFamily: "var(--font-mono)" }}>Sprint 31</span>
          <span style={{ fontSize: 13, color: "var(--text)" }}>May 05 → May 18 · Active</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>3 days remaining</span>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <I.BookOpen size={14} />
          <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>Related KB articles</span>
        </div>
        {DATA.KB_ARTICLES.slice(1, 3).map((kb) => (
          <div key={kb.id} className="row gap-3" style={{
            padding: 8, borderBottom: "1px solid var(--divider)"
          }}>
            <I.FileText size={14} style={{ color: "var(--text-muted)" }} />
            <div className="col" style={{ gap: 1, flex: 1 }}>
              <span style={{ fontSize: 13, color: "var(--text-strong)" }}>{kb.title}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{kb.cat} · {kb.views} views · linked to {kb.linkedTickets} tickets</span>
            </div>
            <button className="btn sm">Insert</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Right sidebar ====================================================
function TicketSidebar({ t, csr, bridge, dev, qa, company, onResolve, ticketId, statusMap, reload, assigningRole, setAssigningRole }) {
  const [actioning, setActioning] = useState(null);

  async function quickStatus(dbName) {
    const status = statusMap[dbName];
    if (!status) return;
    setActioning(dbName);
    try {
      await api.patch(`/tickets/${ticketId}/status`, { status_id: status.id });
      reload();
    } finally {
      setActioning(null);
    }
  }

  return (
    <div style={{ background: "var(--panel-2)", overflowY: "auto" }}>
      <div style={{ padding: 16 }}>
        {/* Quick actions */}
        <div className="col gap-2">
          <button className="btn primary lg" style={{ justifyContent: "flex-start" }}
            onClick={onResolve} disabled={!!actioning}>
            <I.CheckCircle size={14} /> Mark as Resolved
          </button>
          <div className="row gap-2">
            <button className="btn" style={{ flex: 1, justifyContent: "center" }}
              disabled={!!actioning}
              onClick={() => quickStatus('Waiting for Client')}>
              {actioning === 'Waiting for Client' ? 'Saving…' : <><I.Clock size={13} /> Wait on client</>}
            </button>
            <button className="btn" style={{ flex: 1, justifyContent: "center", color: "var(--status-escalated)" }}
              disabled={!!actioning}
              onClick={() => quickStatus('Escalated to Dev')}>
              {actioning === 'Escalated to Dev' ? 'Saving…' : <><I.ArrowUp size={13} /> Escalate</>}
            </button>
          </div>
        </div>

        <div className="divider-h" style={{ margin: "16px 0" }}></div>

        {/* Properties */}
        <div className="section-label" style={{ marginBottom: 10 }}>Properties</div>
        <SidebarProp label="Status" value={<StatusPill status={t.status} />} />
        <SidebarProp label="Priority" value={<PriorityBadge priority={t.priority} />} />
        <SidebarProp label="Category" value={
          <span className="row gap-1" style={{ fontSize: 12.5 }}>
            <CategoryIcon category={t.category} size={12} /> {t.category}
          </span>
        } />
        <SidebarProp label="Channel" value={
          <span className="row gap-1" style={{ fontSize: 12.5 }}>
            <ChannelIcon channel={t.channel} size={12} /> {t.channel}
          </span>
        } />
        <SidebarProp label="Created" value={<span className="mono" style={{ fontSize: 12 }}>{formatMin(t.createdMinAgo)} ago</span>} />
        {t.firstResponseMin ? <SidebarProp label="First response" value={<span className="mono" style={{ fontSize: 12 }}>{formatMin(t.firstResponseMin)} after open</span>} /> : null}

        <div className="divider-h" style={{ margin: "16px 0" }}></div>

        {/* People */}
        <div className="section-label" style={{ marginBottom: 10 }}>People</div>
        <SidebarPerson label="Reporter" user={{ initials: t.contact ? t.contact.split('@')[0].slice(0,2).toUpperCase() : '?', name: t.contact, color: "oklch(0.55 0.18 50)" }} sub={t.contactEmail} />
        <SidebarPerson label="CSR"       user={csr}    role="csr"       editable ticketId={ticketId} reload={reload} assigningRole={assigningRole} setAssigningRole={setAssigningRole} />
        <SidebarPerson label="Bridge"    user={bridge} role="bridge"    editable ticketId={ticketId} reload={reload} assigningRole={assigningRole} setAssigningRole={setAssigningRole} empty="Assign on escalation" />
        <SidebarPerson label="Developer" user={dev}    role="developer" editable ticketId={ticketId} reload={reload} assigningRole={assigningRole} setAssigningRole={setAssigningRole} empty="—" />
        <SidebarPerson label="QA"        user={qa}     role="qa"        editable ticketId={ticketId} reload={reload} assigningRole={assigningRole} setAssigningRole={setAssigningRole} empty="—" />

        <div className="divider-h" style={{ margin: "16px 0" }}></div>

        {/* Client context */}
        <div className="section-label" style={{ marginBottom: 10 }}>Client context</div>
        <div className="card" style={{ padding: 12 }}>
          <div className="row gap-2" style={{ marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: "var(--accent)",
              color: "white",
              display: "grid", placeItems: "center",
              fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-mono)"
            }}>{(company?.name || t.company)[0]}</div>
            <div className="col" style={{ gap: 1 }}>
              <div className="row gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{t.company}</span>
                {(company?.vip || t.vip) ? <span className="badge" style={{ padding: "0 5px", fontSize: 10, color: "oklch(0.55 0.18 70)", borderColor: "color-mix(in oklch, oklch(0.7 0.18 70) 40%, transparent)" }}>VIP</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{company?.contacts || 18} contacts · {company?.openTickets || 9} open</div>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lifetime</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>124 tickets</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>CSAT (90d)</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--sla-ok)" }}>4.7 ★</div>
            </div>
          </div>
        </div>

        <div className="divider-h" style={{ margin: "16px 0" }}></div>

        <div className="section-label" style={{ marginBottom: 10 }}>Tags</div>
        <div className="row gap-1" style={{ flexWrap: "wrap" }}>
          {t.tags?.map((tag) => <Tag key={tag} name={tag} />)}
          <button className="btn sm ghost" style={{ padding: "2px 6px", fontSize: 11 }}><I.Plus size={10} /> Add</button>
        </div>

        <div className="divider-h" style={{ margin: "16px 0" }}></div>

        <div className="section-label" style={{ marginBottom: 10 }}>Watchers ({t.watchers})</div>
        <div className="avatar-stack">
          {DATA.USERS.slice(0, Math.min(t.watchers, 5)).map((u) => <Avatar key={u.id} user={u} size="sm" />)}
        </div>
      </div>
    </div>
  );
}

function SidebarProp({ label, value }) {
  return (
    <div className="row gap-3" style={{ padding: "4px 0", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <div>{value}</div>
    </div>
  );
}

function SidebarPerson({ label, user, editable, sub, empty, role, ticketId, reload, assigningRole, setAssigningRole }) {
  const isOpen = assigningRole === role;
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setAssigningRole(null); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  return (
    <div style={{ padding: "5px 0", position: "relative" }} ref={ref}>
      <div className="row gap-3" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
        {user ? (
          <div className="row gap-2">
            <Avatar user={user} size="sm" />
            <div className="col" style={{ gap: 0 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-strong)", fontWeight: 500 }}>{user.name}</span>
              {sub ? <span style={{ fontSize: 10.5, color: "var(--text-muted)" }} className="mono">{sub}</span> : null}
            </div>
            {editable && role && (
              <button className="btn ghost icon sm" style={{ padding: 2 }} onClick={() => setAssigningRole(isOpen ? null : role)}>
                <I.Edit size={11} />
              </button>
            )}
          </div>
        ) : (
          editable && role ? (
            <button className="btn sm ghost" style={{ color: "var(--text-muted)", fontSize: 11.5 }}
              onClick={() => setAssigningRole(isOpen ? null : role)}>
              <I.Plus size={11} /> {empty || "Assign"}
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{empty || "—"}</span>
          )
        )}
      </div>
      {isOpen && (
        <AssignPicker
          role={role}
          ticketId={ticketId}
          reload={reload}
          onClose={() => setAssigningRole(null)}
        />
      )}
    </div>
  );
}

// === Assign picker ====================================================
const ROLE_LABELS = { csr: 'CSR', bridge: 'Bridge', developer: 'Developer', qa: 'QA' };

function AssignPicker({ role, ticketId, reload, onClose }) {
  // Map internal role key → User.role value in DB
  const roleMap = { csr: 'CSR', bridge: 'Bridge', developer: 'Developer', qa: 'QA' };
  const { users, loading } = useUsers(roleMap[role]);
  const [saving, setSaving] = useState(null);

  async function assign(userId) {
    setSaving(userId);
    try {
      await api.patch(`/tickets/${ticketId}/assign`, { role, user_id: userId });
      reload();
      onClose();
    } catch {
      setSaving(null);
    }
  }

  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 4px)",
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
      padding: 6, minWidth: 200, zIndex: 30
    }}>
      <div style={{ fontSize: 10.5, color: "var(--text-faint)", padding: "6px 10px 4px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        Assign {ROLE_LABELS[role]}
      </div>
      {loading && <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>}
      {!loading && users.length === 0 && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>No {ROLE_LABELS[role]} users found</div>
      )}
      {users.map(u => (
        <div key={u.id}
          onClick={() => assign(u.id)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 10px", borderRadius: "var(--radius-md)",
            cursor: saving ? "wait" : "pointer",
            opacity: saving && saving !== u.id ? 0.5 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Avatar user={{ initials: u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), color: "var(--accent)" }} size="sm" />
          <div className="col" style={{ gap: 0, flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-strong)" }}>{u.name}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</span>
          </div>
          {saving === u.id && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Saving…</span>}
        </div>
      ))}
    </div>
  );
}

// === Resolve modal ====================================================
function ResolveModal({ t, statusMap, reload, onClose }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleResolve() {
    const status = statusMap['Resolved'];
    if (!status) { setError('Resolved status not found'); return; }
    setSaving(true);
    try {
      await api.patch(`/tickets/${t.id}/status`, { status_id: status.id, note: note.trim() || undefined });
      reload();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to resolve ticket');
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(2px)",
      display: "grid", placeItems: "center", zIndex: 100,
      animation: "fade-in 0.16s ease-out"
    }} onClick={onClose}>
      <div className="card" style={{ width: 560, maxWidth: "90vw", padding: 0, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="row gap-2" style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)" }}>
          <I.CheckCircle size={16} style={{ color: "var(--sla-ok)" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-strong)" }}>Mark ticket as Resolved</span>
          <button className="btn ghost icon" style={{ marginLeft: "auto" }} onClick={onClose}><I.X size={14} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            This will close the SLA timer and notify <strong>{t.contact}</strong> that their ticket has been resolved.
          </div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Resolution note (optional)</label>
          <textarea className="textarea" placeholder="Describe what was done to resolve the issue…" value={note} onChange={e => setNote(e.target.value)} />
          {error && <div style={{ fontSize: 12.5, color: "var(--sla-breach)", marginTop: 8 }}>{error}</div>}
        </div>
        <div className="row gap-2" style={{ padding: "12px 20px", borderTop: "1px solid var(--divider)", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleResolve} disabled={saving}>
            <I.CheckCircle size={13} /> {saving ? 'Resolving…' : 'Resolve ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
