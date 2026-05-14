import { useState, useEffect, useCallback } from 'react';
import api from './api';
import { adaptTicket } from './adapters';

export function useDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard')
      .then(({ data: d }) => {
        setData({
          ...d,
          my_tickets: (d.my_tickets ?? []).map(adaptTicket),
          new_queue:  (d.new_queue  ?? []).map(adaptTicket),
        });
        setError(null);
      })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

export function useTickets(params = {}) {
  const [tickets, setTickets]   = useState([]);
  const [meta, setMeta]         = useState(null);   // pagination meta
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const key = JSON.stringify(params);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/tickets', { params })
      .then(({ data }) => {
        setTickets((data.data ?? []).map(adaptTicket));
        setMeta(data.meta ?? null);
        setError(null);
      })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => { load(); }, [load]);

  return { tickets, meta, loading, error, reload: load };
}

export function useTicket(id) {
  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/tickets/${id}`)
      .then(({ data }) => { setTicket(adaptTicket(data)); setError(null); })
      .catch(err => setError(err.response?.data?.message ?? 'Ticket not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { ticket, loading, error, reload: load };
}

export function useUsers(role) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = role ? { role } : {};
    api.get('/users', { params })
      .then(({ data }) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role]);

  return { users, loading };
}

export function useLookups() {
  const [lookups, setLookups]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/lookups')
      .then(({ data }) => setLookups(data))
      .finally(() => setLoading(false));
  }, []);

  return { lookups, loading };
}

// All tickets in escalation pipeline (for BridgeView)
const ESCALATION_STATUSES = [
  'Escalated to Dev', 'Under Review', 'Deferred to Sprint',
  'In Development', 'In QA/Testing', 'Ready for Deployment',
].join(',');

export function useEscalatedTickets() {
  return useTickets({ statuses: ESCALATION_STATUSES, per_page: 100 });
}

// All sprints
export function useSprints() {
  const [sprints, setSprints]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/sprints')
      .then(({ data }) => { setSprints(data); setError(null); })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load sprints'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { sprints, loading, error, reload: load };
}

export function useAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/analytics')
      .then(({ data: d }) => { setData(d); setError(null); })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/companies')
      .then(({ data }) => { setCompanies(data); setError(null); })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { companies, loading, error, reload: load };
}

export function useKbArticles(search = '') {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = search ? { search } : {};
    api.get('/kb-articles', { params })
      .then(({ data }) => { setArticles(data); setError(null); })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load articles'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);
  return { articles, loading, error, reload: load };
}
