import React, { useEffect, useState } from 'react';
import { fetchMarketResearch, upsertMarketResearch } from '../../services/api';

const AdminMarketResearchPage = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: '',
    service: '',
    description: '',
    minRatePerHour: '',
    maxRatePerHour: '',
    currency: 'LKR'
  });

  const load = async () => {
    setError('');
    try {
      const res = await fetchMarketResearch();
      setRows(res.data.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load market research.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await upsertMarketResearch({
        category: form.category,
        service: form.service,
        description: form.description,
        minRatePerHour: Number(form.minRatePerHour),
        maxRatePerHour: Number(form.maxRatePerHour),
        currency: form.currency
      });
      setForm({ category: '', service: '', description: '', minRatePerHour: '', maxRatePerHour: '', currency: 'LKR' });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save market research.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'rgba(2,6,23,0.65)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 18, padding: 14 }}>
      <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Market Research</h3>
      <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>Hourly value ranges</div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <input style={inputStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category" />
        <input style={inputStyle} value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="Service" />
        <input style={inputStyle} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10 }}>
          <input style={inputStyle} type="number" value={form.minRatePerHour} onChange={(e) => setForm((f) => ({ ...f, minRatePerHour: e.target.value }))} placeholder="Min/hr" />
          <input style={inputStyle} type="number" value={form.maxRatePerHour} onChange={(e) => setForm((f) => ({ ...f, maxRatePerHour: e.target.value }))} placeholder="Max/hr" />
          <input style={inputStyle} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} placeholder="Currency" />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={save} disabled={saving} style={primaryBtnStyle}>
          {saving ? 'Saving…' : 'Save Market Value'}
        </button>
      </div>

      <div style={{ marginTop: 12, borderTop: '1px solid rgba(59,130,246,0.18)', paddingTop: 10 }}>
        {rows.map((r) => (
          <div key={r._id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(59,130,246,0.10)', fontWeight: 900, color: '#e5e7eb' }}>
            {r.category} / {r.service} — {r.currency} {r.minRatePerHour} to {r.maxRatePerHour} per hour
          </div>
        ))}
        {!rows.length && <div style={{ color: '#94a3b8', fontWeight: 800 }}>No market research rows yet.</div>}
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(51,65,85,1)',
  background: 'rgba(15,23,42,0.92)',
  color: '#e5e7eb',
  outline: 'none',
  fontWeight: 800
};

const primaryBtnStyle = {
  padding: '10px 12px',
  borderRadius: 999,
  border: 'none',
  background: 'linear-gradient(120deg, #22d3ee, #0ea5e9)',
  color: '#0b1120',
  fontWeight: 1100,
  cursor: 'pointer'
};

const errorStyle = {
  marginTop: 10,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(248,113,113,0.35)',
  background: 'rgba(127,29,29,0.25)',
  color: '#fecaca',
  fontWeight: 900,
  fontSize: 13
};

export default AdminMarketResearchPage;

