import React, { useEffect, useMemo, useState } from 'react';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../../services/api';

const AdminCategoryManagementPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchCategories({ search: search.trim() || undefined });
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const visible = useMemo(() => {
    let data = [...rows];
    if (filterActiveOnly) data = data.filter((r) => r.active);
    if (sortBy === 'name-asc') data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'name-desc') data.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (sortBy === 'status') data.sort((a, b) => Number(b.active) - Number(a.active));
    return data;
  }, [rows, filterActiveOnly, sortBy]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createCategory({ name: name.trim(), description: description.trim(), active });
      setName('');
      setDescription('');
      setActive(true);
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to create category.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({ name: row.name || '', description: row.description || '', active: !!row.active });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    setError('');
    try {
      await updateCategory(editing.id, editForm);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update category.');
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;
    setError('');
    try {
      await deleteCategory(row.id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 14 }}>
      <div style={{ background: 'rgba(2,6,23,0.55)', border: '1px solid rgba(148,163,184,0.22)', borderRadius: 18, padding: 14, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Category Creation</h3>
            <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>Command Center · Taxonomy</div>
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', marginBottom: 6 }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g., Plumbing" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', marginBottom: 6 }}>Description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} placeholder="Short description..." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1' }}>Active State</div>
            <button type="button" onClick={() => setActive((v) => !v)} style={toggleStyle(active)} aria-pressed={active}>
              <span style={knobStyle(active)} />
            </button>
          </div>
          <button type="submit" disabled={creating} style={primaryBtnStyle}>
            {creating ? 'Creating…' : 'Create Category'}
          </button>
        </form>
      </div>

      <div style={{ background: 'rgba(2,6,23,0.65)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Category Inventory</h3>
            <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
              {visible.length} visible · {rows.length} total
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, width: 280 }} placeholder="Search…" />
            <button type="button" onClick={() => setFilterActiveOnly((v) => !v)} style={chipBtnStyle}>
              Filter: {filterActiveOnly ? 'Active' : 'All'}
            </button>
            <button type="button" onClick={() => setSortBy((s) => (s === 'name-asc' ? 'name-desc' : s === 'name-desc' ? 'status' : 'name-asc'))} style={chipBtnStyle}>
              Sort
            </button>
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ marginTop: 12, border: '1px solid rgba(59,130,246,0.22)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 12, color: '#cbd5e1', fontWeight: 800 }}>Loading…</div>
          ) : visible.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(15,23,42,0.85)' }}>
                <tr>
                  <Th>Category</Th>
                  <Th>ID</Th>
                  <Th>Status</Th>
                  <Th style={{ width: 160 }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid rgba(59,130,246,0.18)' }}>
                    <Td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={iconStyle}>{String(r.name || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 1100, color: '#e5e7eb' }}>{r.name}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>{r.description || '—'}</div>
                        </div>
                      </div>
                    </Td>
                    <Td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#cbd5e1' }}>{r.code}</Td>
                    <Td>
                      <span style={badgeStyle(r.active)}>{r.active ? 'Active' : 'Inactive'}</span>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={miniBtnStyle} onClick={() => alert(JSON.stringify(r, null, 2))} title="View">
                          View
                        </button>
                        <button type="button" style={miniBtnStyle} onClick={() => openEdit(r)} title="Edit">
                          Edit
                        </button>
                        <button type="button" style={{ ...miniBtnStyle, borderColor: 'rgba(248,113,113,0.35)', color: '#fecaca' }} onClick={() => remove(r)} title="Delete">
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 12, color: '#94a3b8', fontWeight: 800 }}>No categories.</div>
          )}
        </div>
      </div>

      {editing && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 1100, color: '#e5e7eb' }}>Edit Category</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>{editing.code}</div>
              </div>
              <button type="button" onClick={() => setEditing(null)} style={chipBtnStyle}>
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1' }}>Active</div>
                <button type="button" onClick={() => setEditForm((f) => ({ ...f, active: !f.active }))} style={toggleStyle(editForm.active)}>
                  <span style={knobStyle(editForm.active)} />
                </button>
              </div>
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

const Th = ({ children, style }) => (
  <th
    style={{
      padding: '10px 10px',
      textAlign: 'left',
      fontSize: 12,
      fontWeight: 1100,
      color: '#94a3b8',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      ...style
    }}
  >
    {children}
  </th>
);

const Td = ({ children, style }) => (
  <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 900, color: '#e5e7eb', ...style }}>{children}</td>
);

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

const toggleStyle = (on) => ({
  width: 44,
  height: 24,
  borderRadius: 999,
  border: `1px solid ${on ? 'rgba(34,211,238,0.65)' : 'rgba(51,65,85,1)'}`,
  background: on ? 'linear-gradient(120deg, #22d3ee, #0ea5e9)' : 'rgba(15,23,42,0.92)',
  padding: 3,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center'
});

const knobStyle = (on) => ({
  width: 18,
  height: 18,
  borderRadius: 999,
  background: '#0b1120',
  transform: `translateX(${on ? 18 : 0}px)`,
  transition: 'transform 160ms ease'
});

const badgeStyle = (on) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 10px',
  borderRadius: 999,
  border: `1px solid ${on ? 'rgba(34,197,94,0.45)' : 'rgba(148,163,184,0.30)'}`,
  background: on ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.10)',
  color: on ? '#bbf7d0' : '#cbd5e1',
  fontWeight: 1100,
  fontSize: 12
});

const iconStyle = {
  width: 30,
  height: 30,
  borderRadius: 12,
  border: '1px solid rgba(56,189,248,0.35)',
  background: 'rgba(2,6,23,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 1100
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
  maxWidth: 540,
  background: 'rgba(2,6,23,0.95)',
  borderRadius: 18,
  border: '1px solid rgba(59,130,246,0.28)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
  padding: 14
};

export default AdminCategoryManagementPage;

