import React, { useEffect, useMemo, useState } from 'react';
import {
  ensureCatalogDefaults,
  getCatalog,
  getCatalogRequests,
  markCatalogRequestDone,
  saveCatalog
} from '../../utils/catalogStore';

const Admin2CatalogManagerPage = () => {
  const [catalog, setCatalog] = useState({ categories: [], servicesByCategory: {} });
  const [requests, setRequests] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newService, setNewService] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    ensureCatalogDefaults();
    const loadedCatalog = getCatalog();
    setCatalog(loadedCatalog);
    setSelectedCategory(loadedCatalog.categories[0] || '');
    setRequests(getCatalogRequests());
  }, []);

  const categoryServices = useMemo(() => catalog.servicesByCategory[selectedCategory] || [], [catalog, selectedCategory]);

  const addCategory = () => {
    const cleaned = String(newCategory || '').trim();
    if (!cleaned) return;
    if (catalog.categories.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
      setMessage('Category already exists.');
      return;
    }
    const next = {
      categories: [...catalog.categories, cleaned],
      servicesByCategory: { ...catalog.servicesByCategory, [cleaned]: [] }
    };
    setCatalog(next);
    setSelectedCategory(cleaned);
    saveCatalog(next);
    setNewCategory('');
    setMessage('Category created.');
  };

  const addService = () => {
    const cleaned = String(newService || '').trim();
    if (!selectedCategory || !cleaned) return;
    const list = catalog.servicesByCategory[selectedCategory] || [];
    if (list.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      setMessage('Service already exists in this category.');
      return;
    }
    const next = {
      ...catalog,
      servicesByCategory: {
        ...catalog.servicesByCategory,
        [selectedCategory]: [...list, cleaned]
      }
    };
    setCatalog(next);
    saveCatalog(next);
    setNewService('');
    setMessage('Service created.');
  };

  const completeRequest = (req) => {
    if (!req?.id) return;
    markCatalogRequestDone(req.id);
    setRequests(getCatalogRequests());
    setMessage('Request marked as done.');
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(229,231,235,1)', padding: 18 }}>
      <h3 style={{ margin: 0, fontWeight: 1100, color: '#111827' }}>Admin2 - Category and Services</h3>
      <p style={{ margin: '8px 0 14px', color: '#6b7280', fontWeight: 800 }}>
        Create and manage categories/services requested by Admin1.
      </p>

      {message && (
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 900, color: '#374151' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ border: '1px solid rgba(229,231,235,1)', borderRadius: 14, padding: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontWeight: 1100 }}>Categories</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid rgba(229,231,235,1)', borderRadius: 10 }}
            />
            <button type="button" onClick={addCategory}>Add</button>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(229,231,235,1)', borderRadius: 10 }}
          >
            {catalog.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ border: '1px solid rgba(229,231,235,1)', borderRadius: 14, padding: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontWeight: 1100 }}>Services</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="New service"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid rgba(229,231,235,1)', borderRadius: 10 }}
            />
            <button type="button" onClick={addService}>Add</button>
          </div>
          <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid rgba(229,231,235,1)', borderRadius: 10, padding: 8 }}>
            {categoryServices.length ? (
              categoryServices.map((svc) => (
                <div key={svc} style={{ padding: '6px 4px', fontWeight: 800 }}>
                  {svc}
                </div>
              ))
            ) : (
              <div style={{ padding: '6px 4px', color: '#6b7280', fontWeight: 800 }}>No services yet.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, border: '1px solid rgba(229,231,235,1)', borderRadius: 14 }}>
        <div style={{ padding: 12, borderBottom: '1px solid rgba(229,231,235,1)', fontWeight: 1100 }}>Requests from Admin1</div>
        <div style={{ padding: 12 }}>
          {requests.length ? (
            requests.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0' }}>
                <div style={{ fontWeight: 800 }}>
                  {r.category} / {r.service} {r.supplierName ? `- ${r.supplierName}` : ''}
                  <span style={{ marginLeft: 8, color: r.status === 'done' ? '#16a34a' : '#6b7280' }}>({r.status})</span>
                </div>
                {r.status !== 'done' && (
                  <button type="button" onClick={() => completeRequest(r)}>
                    Mark Done
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: '#6b7280', fontWeight: 800 }}>No requests yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin2CatalogManagerPage;
