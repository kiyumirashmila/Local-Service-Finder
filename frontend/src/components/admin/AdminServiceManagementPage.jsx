import React, { useEffect, useMemo, useState } from 'react';
import { createService, deleteService, fetchServices, updateService } from '../../services/api';

const AdminServiceManagementPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', location: '', contact: '', providerName: 'System Catalog', description: '' });

  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', category: '', location: '', contact: '', providerName: '', description: '' });

  const load = async (q = {}) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchServices(q);
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load({
        search: search.trim() || undefined,
        category: category.trim() || undefined
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search, category]);

  const categories = useMemo(() => {
    const uniq = Array.from(new Set((rows || []).map((r) => r.category).filter(Boolean)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  }, [rows]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category.trim()) {
      setError('Title and category are required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await createService({
        title: form.title.trim(),
        category: form.category.trim(),
        location: form.location.trim() || 'All',
        contact: form.contact.trim() || 'N/A',
        providerName: form.providerName.trim() || 'System Catalog',
        description: form.description.trim() || ''
      });
      setForm({ title: '', category: '', location: '', contact: '', providerName: 'System Catalog', description: '' });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to create service.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      title: row.title || '',
      category: row.category || '',
      location: row.location || '',
      contact: row.contact || '',
      providerName: row.providerName || '',
      description: row.description || ''
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    setError('');
    try {
      await updateService(editing._id, editForm);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update service.');
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete service "${row.title}"?`)) return;
    setError('');
    try {
      await deleteService(row._id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete service.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 14 }}>
      <div style={{ background: 'rgba(2,6,23,0.55)', border: '1px solid rgba(148,163,184,0.22)', borderRadius: 18, padding: 14 }}>
        <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Service Management</h3>
        <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>Create catalog services</div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="Service title" />
          <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle} placeholder="Category (e.g. Plumbing)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="Location (optional)" />
            <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} style={inputStyle} placeholder="Contact (optional)" />
          </div>
          <input value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))} style={inputStyle} placeholder="Provider name" />
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} placeholder="Description (optional)" />
          <button type="submit" style={primaryBtnStyle} disabled={creating}>
            {creating ? 'Creating…' : 'Create Service'}
          </button>
        </form>
      </div>

      <div style={{ background: 'rgba(2,6,23,0.65)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Services Inventory</h3>
            <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>{rows.length} total</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, width: 240 }} placeholder="Search…" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 220 }}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ marginTop: 12, border: '1px solid rgba(59,130,246,0.22)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 12, color: '#cbd5e1', fontWeight: 800 }}>Loading…</div>
          ) : rows.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(15,23,42,0.85)' }}>
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th style={{ width: 160 }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} style={{ borderTop: '1px solid rgba(59,130,246,0.18)' }}>
                    <Td>
                      <div style={{ fontWeight: 1100 }}>{r.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>{r.providerName || '—'}</div>
                    </Td>
                    <Td>{r.category || '-'}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={miniBtnStyle} onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button type="button" style={{ ...miniBtnStyle, borderColor: 'rgba(248,113,113,0.35)', color: '#fecaca' }} onClick={() => remove(r)}>
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 12, color: '#94a3b8', fontWeight: 800 }}>No services.</div>
          )}
        </div>
      </div>

      {editing && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 1100, color: '#e5e7eb' }}>Edit Service</div>
              <button type="button" onClick={() => setEditing(null)} style={chipBtnStyle}>
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
              <input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} style={inputStyle} />
                <input value={editForm.contact} onChange={(e) => setEditForm((f) => ({ ...f, contact: e.target.value }))} style={inputStyle} />
              </div>
              <input value={editForm.providerName} onChange={(e) => setEditForm((f) => ({ ...f, providerName: e.target.value }))} style={inputStyle} />
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setEditing(null)} style={chipBtnStyle}>
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} disabled={savingEdit} style={primaryBtnStyle}>
                  {savingEdit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Th = ({ children }) => (
  <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 12, fontWeight: 1100, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
    {children}
  </th>
);

const Td = ({ children }) => <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 900, color: '#e5e7eb' }}>{children}</td>;

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
  width: '100%',
  padding: '10px 12px',
  borderRadius: 999,
  border: 'none',
  background: 'linear-gradient(120deg, #22d3ee, #0ea5e9)',
  color: '#0b1120',
  fontWeight: 1100,
  cursor: 'pointer'
};

const chipBtnStyle = {
  padding: '9px 12px',
  borderRadius: 999,
  border: '1px solid rgba(51,65,85,1)',
  background: 'rgba(15,23,42,0.92)',
  color: '#e5e7eb',
  fontWeight: 900,
  cursor: 'pointer'
};

const miniBtnStyle = {
  padding: '7px 10px',
  borderRadius: 999,
  border: '1px solid rgba(51,65,85,1)',
  background: 'rgba(15,23,42,0.92)',
  color: '#e5e7eb',
  fontWeight: 900,
  cursor: 'pointer',
  fontSize: 12
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

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  zIndex: 9999
};

const modalCard = {
  width: '100%',
  maxWidth: 600,
  background: 'rgba(2,6,23,0.95)',
  borderRadius: 18,
  border: '1px solid rgba(59,130,246,0.28)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
  padding: 14
};

export default AdminServiceManagementPage;

