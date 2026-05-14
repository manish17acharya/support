import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DATA } from './data';
import * as I from './icons';

// === Tiny visual primitives ===========================================

export function Avatar({ user, size = "" }) {
  if (!user) return <span className={"avatar " + size} style={{ background: "var(--text-faint)" }}>?</span>;
  return (
    <span className={"avatar " + size} style={{ background: user.color || "var(--accent)" }} title={user.name}>
      {user.initials}
    </span>
  );
}

export function StatusPill({ status, size }) {
  const s = DATA.STATUSES[status] || DATA.STATUSES.New;
  return (
    <span className="status-pill" style={{ "--status-color": s.color, fontSize: size === "sm" ? 10.5 : 11.5 }}>
      <span className="dot"></span>
      {s.short}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = DATA.PRIORITIES[priority];
  if (!p) return null;
  return <span className={"pri " + p.cls}>{p.name}</span>;
}

export function ChannelIcon({ channel, size = 13 }) {
  const map = {
    "Email": <I.Mail size={size} />,
    "Web Form": <I.Globe size={size} />,
    "Phone": <I.Phone size={size} />,
    "WhatsApp": <I.Whatsapp size={size} />,
    "Walk-in": <I.User size={size} />,
  };
  return <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{map[channel] || <I.Mail size={size} />}</span>;
}

export function CategoryIcon({ category, size = 13 }) {
  const map = {
    "Bug Report":      <I.Alert size={size} />,
    "Feature Request": <I.Zap size={size} />,
    "Service Request": <I.Settings size={size} />,
    "Complaint":       <I.Flag size={size} />,
    "General Inquiry": <I.MessageSquare size={size} />,
    "Other":           <I.Folder size={size} />,
  };
  return map[category] || <I.Folder size={size} />;
}

export function Tag({ name }) {
  return (
    <span className="badge" style={{ fontSize: 11, padding: "1px 7px", background: "transparent" }}>
      <span style={{ color: "var(--text-muted)" }}>#</span>
      {name}
    </span>
  );
}

// === SLA timer ========================================================

export function formatMin(mins) {
  if (mins == null) return "—";
  const abs = Math.abs(mins);
  if (abs < 60) return `${Math.round(abs)}m`;
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  if (h < 24) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH === 0 ? `${d}d` : `${d}d ${remH}h`;
}

export function SLATag({ sla, label = "Resolution" }) {
  if (!sla) return null;
  if (sla.met) {
    return (
      <span className="sla-tag">
        <I.CheckCircle size={11} /> {label} met
      </span>
    );
  }
  const remaining = sla.target - sla.elapsed;
  const pct = sla.elapsed / sla.target;
  if (sla.paused) {
    return (
      <span className="sla-tag" style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}>
        <I.Pause size={11} /> SLA paused
      </span>
    );
  }
  if (sla.breached || remaining < 0) {
    return (
      <span className="sla-tag breach">
        <I.Alert size={11} /> Breached {formatMin(Math.abs(remaining))}
      </span>
    );
  }
  if (pct > 0.75) {
    return (
      <span className="sla-tag warn">
        <I.Clock size={11} /> {formatMin(remaining)} left
      </span>
    );
  }
  return (
    <span className="sla-tag">
      <I.Clock size={11} /> {formatMin(remaining)} left
    </span>
  );
}

export function SLABar({ sla, height = 4 }) {
  if (!sla) return null;
  const pct = Math.min(100, (sla.elapsed / sla.target) * 100);
  let cls = "sla-bar";
  if (sla.breached || pct >= 100) cls += " breach";
  else if (pct >= 75) cls += " warn";
  if (sla.paused) cls += " paused";
  return (
    <div className={cls} style={{ height }}>
      <div className="fill" style={{ width: pct + "%" }}></div>
    </div>
  );
}

// === Sidebar ==========================================================

export function Sidebar({ view, setView, role, user, onLogout }) {
  const navByRole = {
    Client: [
      { id: "client-home",    label: "My Tickets",     icon: <I.Ticket /> },
      { id: "new-ticket",     label: "New Request",    icon: <I.Plus /> },
      { id: "kb",             label: "Help Center",    icon: <I.BookOpen /> },
    ],
    CSR: [
      { id: "dashboard",      label: "My Dashboard",   icon: <I.Dashboard />, badge: 7 },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "new-ticket",     label: "New Ticket",     icon: <I.Plus /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
    ],
    Bridge: [
      { id: "bridge",         label: "Escalations",    icon: <I.GitBranch />, badge: 4 },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
    ],
    Developer: [
      { id: "dev",            label: "My Work",        icon: <I.Code />, badge: 3 },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
    ],
    QA: [
      { id: "dev",            label: "Testing Queue",  icon: <I.CheckCircle /> },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
    ],
    Admin: [
      { id: "analytics",      label: "Analytics",      icon: <I.BarChart /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "bridge",         label: "Escalations",    icon: <I.GitBranch /> },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
      { id: "companies",      label: "Companies",      icon: <I.Building /> },
      { id: "users",          label: "Users & Roles",  icon: <I.Users /> },
      { id: "audit",          label: "Audit Log",      icon: <I.FileText /> },
      { id: "settings",       label: "Settings",       icon: <I.Settings /> },
    ],
    SuperAdmin: [
      { id: "users",          label: "Users & Roles",  icon: <I.Users /> },
      { id: "analytics",      label: "Analytics",      icon: <I.BarChart /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "bridge",         label: "Escalations",    icon: <I.GitBranch /> },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
      { id: "companies",      label: "Companies",      icon: <I.Building /> },
      { id: "audit",          label: "Audit Log",      icon: <I.FileText /> },
      { id: "settings",       label: "Settings",       icon: <I.Settings /> },
    ],
    Manager: [
      { id: "analytics",      label: "Analytics",      icon: <I.BarChart /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "bridge",         label: "Escalations",    icon: <I.GitBranch /> },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
      { id: "companies",      label: "Companies",      icon: <I.Building /> },
      { id: "users",          label: "Users & Roles",  icon: <I.Users /> },
    ],
    Supervisor: [
      { id: "dashboard",      label: "My Dashboard",   icon: <I.Dashboard /> },
      { id: "tickets",        label: "All Tickets",    icon: <I.Inbox /> },
      { id: "bridge",         label: "Escalations",    icon: <I.GitBranch /> },
      { id: "sprints",        label: "Sprint Board",   icon: <I.Layers /> },
      { id: "kb",             label: "Knowledge Base", icon: <I.BookOpen /> },
      { id: "users",          label: "Team",           icon: <I.Users /> },
    ],
  };

  const items = navByRole[role] || navByRole.CSR;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div className="col" style={{ gap: 0 }}>
          <div className="brand-name">Sentry Support</div>
          <div className="brand-sub">STMS · v2.0</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-title">Workspace</div>
        {items.map((item) => (
          <div
            key={item.id}
            className={"nav-item" + (view === item.id ? " active" : "")}
            onClick={() => setView(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge ? (
              <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: 0, fontFamily: "var(--font-mono)" }}>{item.badge}</span>
            ) : null}
          </div>
        ))}

        {role !== "Client" ? (
          <>
            <div style={{ height: 16 }}></div>
            <div className="sidebar-section-title">Filters</div>
            <div className="nav-item"><I.Star /> Starred</div>
            <div className="nav-item"><I.Bookmark /> Saved views</div>
            <div className="nav-item"><I.Tag /> Tags</div>
          </>
        ) : null}
      </div>

      <div className="sidebar-footer">
        <div className="row gap-3" style={{ padding: "6px 8px" }}>
          <Avatar user={{
            initials: user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?',
            color: "var(--accent)"
          }} />
          <div className="col" style={{ gap: 0, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-strong)" }} className="truncate">{user?.name ?? '—'}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }} className="truncate">{role}</div>
          </div>
          <button className="btn icon ghost" style={{ marginLeft: "auto" }} title="Sign out" onClick={onLogout}>
            <I.Logout size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// === Topbar ===========================================================

export function Topbar({ role, theme, setTheme, view, setView, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className="topbar">
      <div className="search-input" style={{ width: 380 }}>
        <I.Search size={14} />
        <input placeholder="Search tickets, clients, articles…" />
        <span className="kbd">⌘K</span>
      </div>

      <div className="spacer"></div>

      {role !== "Client" ? (
        <button className="btn" onClick={() => setView && setView("new-ticket")}>
          <I.Plus size={14} /> New ticket
        </button>
      ) : null}

      <button className="btn ghost icon" title="Notifications" style={{ position: "relative" }}>
        <I.Bell size={16} />
        <span style={{
          position: "absolute", top: 5, right: 5,
          width: 7, height: 7, borderRadius: 999,
          background: "var(--sla-breach)", border: "2px solid var(--bg)"
        }}></span>
      </button>

      <button className="btn ghost icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Toggle theme">
        {theme === "light" ? <I.Moon size={16} /> : <I.Sun size={16} />}
      </button>

      {/* User menu */}
      <div style={{ position: "relative" }} ref={menuRef}>
        <div className="role-switcher" onClick={() => setOpen(!open)}>
          <div className="col" style={{ gap: 0, alignItems: "flex-end" }}>
            <span className="role-name">{user?.name || "User"}</span>
            <span className="role-label">{role}</span>
          </div>
          <Avatar user={{ initials, color: "var(--accent)" }} />
          <I.ChevronDown size={14} />
        </div>
        {open && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
            padding: 6, width: 220, zIndex: 50
          }}>
            <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--divider)", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{user?.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{user?.email}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{role}</div>
            </div>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 10px", borderRadius: "var(--radius-md)",
                cursor: "pointer", color: "oklch(0.55 0.2 20)",
                fontSize: 13, border: 0, background: "transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <I.Logout size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// === Card / page header helpers =======================================

export function Card({ title, action, children, padded = false, style }) {
  return (
    <div className="card" style={style}>
      {title ? (
        <div className="card-header">
          <div className="card-title">{title}</div>
          {action || null}
        </div>
      ) : null}
      <div style={{ padding: padded ? 16 : 0 }}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, delta, icon, valueColor }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="stat-value" style={valueColor ? { color: valueColor } : null}>{value}</div>
      {delta ? (
        <div className={"stat-delta " + (delta.kind || "")}>
          {delta.kind === "up" ? <I.ArrowUp size={11} /> : delta.kind === "down" ? <I.ArrowDown size={11} /> : null}
          <span>{delta.text}</span>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, tabs, activeTab, onTab }) {
  return (
    <div className="page-header">
      <div className="row gap-4" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
        </div>
        <div className="row gap-2">{actions}</div>
      </div>
      {tabs ? (
        <div className="tabs" style={{ marginTop: 12, marginBottom: -16 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={"tab" + (activeTab === t.id ? " active" : "")}
              onClick={() => onTab && onTab(t.id)}
            >
              {t.label}
              {t.count != null ? <span className="count">{t.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// === Spark / mini chart ===============================================

export function Sparkline({ values, color, height = 36 }) {
  const max = Math.max(...values);
  return (
    <div className="spark" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className={"bar" + (v === max ? " hi" : "")}
          style={{ height: ((v / max) * 100) + "%", background: color || "var(--accent)" }}
        />
      ))}
    </div>
  );
}

export function LineChart({ a, b, labels, height = 140 }) {
  const max = Math.max(...a, ...b);
  const w = 100;
  const px = (i) => (i / (a.length - 1)) * w;
  const py = (v) => 100 - (v / max) * 90;
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");
  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="lc-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--divider)" strokeWidth="0.3" />
        ))}
        <path d={path(a) + ` L ${px(a.length - 1)} 100 L 0 100 Z`} fill="url(#lc-grad)" />
        <path d={path(a)} stroke="var(--accent)" strokeWidth="1" fill="none" />
        <path d={path(b)} stroke="var(--sla-ok)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
        {a.map((v, i) => (
          <circle key={i} cx={px(i)} cy={py(v)} r="1.2" fill="var(--accent)" />
        ))}
      </svg>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 6, fontSize: 11, color: "var(--text-muted)",
        fontFamily: "var(--font-mono)"
      }}>
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}
