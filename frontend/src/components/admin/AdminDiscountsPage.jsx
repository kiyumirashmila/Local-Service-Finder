import React, { useEffect, useState } from 'react';
import { createDiscount, fetchAdminDiscounts } from '../../services/api';

const AdminDiscountsPage = () => {
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('20');
  const [maxUses, setMaxUses] = useState('100');
  const [expiryDate, setExpiryDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [discounts, setDiscounts] = useState([]);

  const loadDiscounts = async () => {
    try {
      const res = await fetchAdminDiscounts();
      setDiscounts(res?.data?.discounts || []);
    } catch {
      setDiscounts([]);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const submit = async () => {
    setMsg('');
    const parsedExpiry = parseDateInput(expiryDate);
    const payload = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      maxUses: Number(maxUses),
      expiryDate: parsedExpiry
    };
    if (!payload.code || !payload.expiryDate || !Number.isFinite(payload.value) || payload.value <= 0) {
      setMsgType('error');
      setMsg('Please fill code, value and expiry date correctly.');
      return;
    }

    try {
      setBusy(true);
      await createDiscount(payload);
      setMsgType('success');
      setMsg('Promo code created successfully.');
      setCode('');
      setType('percentage');
      setValue('20');
      setMaxUses('100');
      setExpiryDate('');
      await loadDiscounts();
    } catch (e) {
      setMsgType('error');
      setMsg(e?.response?.data?.message || 'Failed to create promo code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(229,231,235,1)',
        borderRadius: 20,
        boxShadow: '0 16px 40px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(229,231,235,1)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,1) 55%)'
        }}
      >
        <h3 style={{ margin: 0, fontWeight: 1100, color: '#111827', fontSize: 16 }}>
          <i className="fas fa-tags" style={{ marginRight: 8, color: '#10b981' }} />
          Discounts & Promo Codes
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ fontWeight: 900, fontSize: 13, color: '#374151' }}>
            Code
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PROMO23" style={inputStyle} />
          </label>
          <label style={{ fontWeight: 900, fontSize: 13, color: '#374151' }}>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>
          <label style={{ fontWeight: 900, fontSize: 13, color: '#374151' }}>
            Value
            <input value={value} onChange={(e) => setValue(e.target.value)} type="number" style={inputStyle} />
          </label>
          <label style={{ fontWeight: 900, fontSize: 13, color: '#374151' }}>
            Max Uses
            <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" style={inputStyle} />
          </label>
          <label style={{ fontWeight: 900, fontSize: 13, color: '#374151', gridColumn: '1 / -1' }}>
            Expiry Date
            <input
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              type="date"
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          Please pick the date from the date picker.
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={submit}
          style={{
            marginTop: 14,
            width: '100%',
            border: 'none',
            borderRadius: 14,
            padding: '12px 14px',
            fontWeight: 1100,
            cursor: busy ? 'not-allowed' : 'pointer',
            background: busy ? '#d1d5db' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff'
          }}
        >
          {busy ? 'Creating...' : 'Create Promo Code'}
        </button>

        {msg ? (
          <div style={{ marginTop: 10, fontWeight: 900, color: msgType === 'success' ? '#065f46' : '#991b1b' }}>{msg}</div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 1100, color: '#111827', marginBottom: 8 }}>Recent Promo Codes</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {discounts.slice(0, 8).map((d) => (
              <div key={d._id || d.code} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, fontSize: 13 }}>
                <b>{d.code}</b> · {d.type} · {d.value} · max {d.maxUses || 'unlimited'} · exp{' '}
                {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-'}
              </div>
            ))}
            {!discounts.length && <div style={{ color: '#6b7280', fontWeight: 800 }}>No promo codes yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(229,231,235,1)',
  fontWeight: 800,
  boxSizing: 'border-box'
};

function parseDateInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      const dd = String(day).padStart(2, '0');
      const mm = String(month).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }
  return '';
}

export default AdminDiscountsPage;
