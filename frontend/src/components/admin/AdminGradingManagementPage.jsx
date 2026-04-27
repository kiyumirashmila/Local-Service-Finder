import React from 'react';
import AdminSuppliersPage from './AdminSuppliersPage';

const AdminGradingManagementPage = () => {
  return (
    <div>
      <div style={{ marginBottom: 12, background: 'rgba(2,6,23,0.65)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 18, padding: 14 }}>
        <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb' }}>Grading Management</h3>
        <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
          Open a supplier and set grading (A/B/C). Approve/reject and send credentials from the same panel.
        </div>
      </div>
      <AdminSuppliersPage />
    </div>
  );
};

export default AdminGradingManagementPage;

