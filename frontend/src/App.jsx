import React, { useState, useEffect } from 'react';
import { Sidebar, Topbar } from './components';
import { CSRDashboard, TicketsList } from './views-dashboard';
import { TicketDetail } from './views-ticket';
import { NewTicketForm, BridgeView, SprintsView, DevWorkView } from './views-other';
import { Analytics, KnowledgeBase, ClientPortal, CompaniesView, UsersView, AuditLog, SettingsView } from './views-admin';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } from './tweaks-panel';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';

const TWEAK_DEFAULTS = {
  accent: "#7755e2",
  density: "comfortable",
  theme: "light",
  showSidebar: true,
};

const ROLE_HOME = {
  Client: "client-home",
  CSR: "dashboard",
  Bridge: "bridge",
  Developer: "dev",
  QA: "dev",
  Admin: "analytics",
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [role, setRole]       = useState("CSR");
  const [view, setView]       = useState("dashboard");
  const [ticketId, setTicketId] = useState(null);

  // Sync real user's role when logged in
  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
      setView(ROLE_HOME[user.role] || "dashboard");
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--accent-hover", `color-mix(in oklch, ${t.accent} 85%, black)`);
    document.documentElement.style.setProperty("--accent-soft", `color-mix(in oklch, ${t.accent} 14%, white)`);
  }, [t.accent]);

  useEffect(() => {
    document.body.style.fontSize = t.density === "compact" ? "13px" : t.density === "spacious" ? "15px" : "14px";
  }, [t.density]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</span>
    </div>
  );

  if (!user) return <LoginPage />;

  const openTicket = (id) => { setTicketId(id); setView("ticket"); };
  const closeTicket = () => {
    setTicketId(null);
    setView(ROLE_HOME[role] || "dashboard");
  };

  let content = null;
  if (view === "ticket" && ticketId) {
    content = <TicketDetail ticketId={ticketId} back={closeTicket} />;
  } else if (view === "dashboard") {
    content = <CSRDashboard openTicket={openTicket} setView={setView} />;
  } else if (view === "tickets") {
    content = <TicketsList openTicket={openTicket} filterRole={role} />;
  } else if (view === "new-ticket") {
    content = <NewTicketForm back={closeTicket} />;
  } else if (view === "bridge") {
    content = <BridgeView openTicket={openTicket} />;
  } else if (view === "sprints") {
    content = <SprintsView openTicket={openTicket} />;
  } else if (view === "dev") {
    content = <DevWorkView role={role} openTicket={openTicket} />;
  } else if (view === "analytics") {
    content = <Analytics />;
  } else if (view === "kb") {
    content = <KnowledgeBase openTicket={openTicket} />;
  } else if (view === "client-home") {
    content = <ClientPortal openTicket={openTicket} />;
  } else if (view === "companies") {
    content = <CompaniesView />;
  } else if (view === "users") {
    content = <UsersView />;
  } else if (view === "audit") {
    content = <AuditLog />;
  } else if (view === "settings") {
    content = <SettingsView />;
  } else {
    content = <CSRDashboard openTicket={openTicket} />;
  }

  return (
    <>
      <div className={"app-shell" + (t.showSidebar ? "" : " collapsed")}>
        {t.showSidebar ? <Sidebar view={view} setView={setView} role={role} user={user} onLogout={logout} /> : null}
        <div className="main-col">
          <Topbar
            role={role}
            setRole={setRole}
            theme={t.theme}
            setTheme={(v) => setTweak("theme", v)}
            view={view}
            setView={setView}
            user={user}
            onLogout={logout}
          />
          <div className="content-area" key={view + "-" + role}>{content}</div>
        </div>
      </div>

      <TweaksPanel title="Tweaks" defaultOpen={false}>
        <TweakSection title="Theme">
          <TweakRadio
            label="Mode"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          />
          <TweakColor
            label="Accent color"
            value={t.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#7755e2", "#0e7c5a", "#c5483b", "#1f6feb"]}
          />
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio
            label="UI scale"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Default" }, { value: "spacious", label: "Spacious" }]}
          />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakToggle label="Show sidebar" value={t.showSidebar} onChange={(v) => setTweak("showSidebar", v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}
