import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchMyBookings, fetchGradingConfig } from '../services/api';

const SupplierHomePage = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [gradingConfig, setGradingConfig] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'supplier') return;
    const load = async () => {
      setBookingsLoading(true);
      try {
        const [bRes, gRes] = await Promise.all([
          fetchMyBookings().catch(() => ({ data: { bookings: [] } })),
          fetchGradingConfig().catch(() => ({ data: null })),
        ]);
        setBookings(Array.isArray(bRes.data?.bookings) ? bRes.data.bookings : []);
        if (gRes.data) setGradingConfig(gRes.data);
      } finally {
        setBookingsLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user?.role]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const approved = bookings.filter(b => b.status === 'approved').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const reviews = bookings.filter(b => b.review && Number(b.review.rating) >= 1);
    const complaints = bookings.filter(b => b.complaint?.submittedAt && b.complaint?.supplierNotifiedAt);
    const pendingComplaints = complaints.filter(c => c.complaint?.status !== 'resolved').length;
    return { total, pending, approved, completed, reviewCount: reviews.length, pendingComplaints };
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [bookings]);

  const displayName = user?.fullName || user?.name || 'Supplier';
  const displayAvatar = user?.avatar || user?.avatarUrl || '';
  const grading = user?.supplierGrading || '-';
  const averageRating = Number(user?.averageRating || 0);
  const xp = Number(user?.xp || 0);
  const tierLevel = user?.tierLevel || 'Bronze';
  const approvalStatus = user?.supplierApprovalStatus || 'pending';
  const gradingLabel = grading && gradingConfig?.[grading]?.label ? gradingConfig[grading].label : `Grade ${grading}`;

  const getInitials = (name = '') =>
    String(name).split(' ').filter(Boolean).map(x => x[0]).join('').toUpperCase().slice(0, 2) || 'SP';

  const getStatusColor = (status) => {
    if (status === 'approved') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' };
    if (status === 'rejected') return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' };
    return { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' };
  };

  const statusStyle = getStatusColor(approvalStatus);

  return (
    <>
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onAddServiceClick={() => {}}
        onLoginClick={() => (window.location.hash = 'login')}
        onSignupClick={() => (window.location.hash = 'signup')}
        onLogout={logout}
        onProfileClick={() => (window.location.hash = 'profile')}
      />
      <div className="supplier-home-page">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

          .supplier-home-page {
            --primary: #f97316;
            --primary-dark: #ea580c;
            --primary-light: #fed7aa;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-400: #9ca3af;
            --gray-500: #6b7280;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --gray-900: #111827;
            --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
            min-height: calc(100vh - 80px);
            background: linear-gradient(160deg, #fff7ed 0%, #fef3c7 25%, #fff5e8 50%, #f0fdf4 100%);
            font-family: var(--font-sans);
            color: var(--gray-900);
            padding: 0;
          }

          /* Hero Welcome Banner */
          .sh-hero {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%);
            padding: 2.5rem 2rem 2rem;
            position: relative;
            overflow: hidden;
          }
          .sh-hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
            pointer-events: none;
          }
          .sh-hero::after {
            content: '';
            position: absolute;
            bottom: -40%;
            left: -10%;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%);
            pointer-events: none;
          }
          .sh-hero-inner {
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            position: relative;
            z-index: 1;
          }
          .sh-avatar {
            width: 80px;
            height: 80px;
            border-radius: 24px;
            background: linear-gradient(135deg, var(--primary-light), #ffedd5);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            border: 3px solid rgba(255,255,255,0.15);
            flex-shrink: 0;
          }
          .sh-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .sh-avatar-fallback {
            font-size: 1.75rem;
            font-weight: 900;
            color: var(--primary-dark);
          }
          .sh-welcome-text {
            flex: 1;
            min-width: 200px;
          }
          .sh-greeting {
            font-size: 0.875rem;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .sh-name {
            font-size: 1.75rem;
            font-weight: 900;
            color: #f1f5f9;
            margin: 0.25rem 0 0;
            letter-spacing: -0.02em;
          }
          .sh-email {
            font-size: 0.875rem;
            font-weight: 600;
            color: #64748b;
            margin-top: 0.25rem;
          }
          .sh-hero-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.75rem;
          }
          .sh-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 800;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.08);
            color: #e2e8f0;
            backdrop-filter: blur(4px);
          }
          .sh-badge i { font-size: 0.7rem; }
          .sh-badge.grade { background: rgba(34,211,238,0.15); border-color: rgba(34,211,238,0.3); color: #67e8f9; }
          .sh-badge.rating { background: rgba(250,204,21,0.15); border-color: rgba(250,204,21,0.3); color: #fde047; }
          .sh-badge.tier { background: rgba(168,85,247,0.15); border-color: rgba(168,85,247,0.3); color: #c084fc; }
          .sh-badge.xp { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); color: #93c5fd; }

          /* Content Area */
          .sh-content {
            max-width: 1280px;
            margin: 0 auto;
            padding: 1.5rem 2rem 3rem;
          }

          /* Stats Grid */
          .sh-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .sh-stat-card {
            background: white;
            border: 1px solid var(--gray-200);
            border-radius: 20px;
            padding: 1.25rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            transition: all 0.25s ease;
            position: relative;
            overflow: hidden;
          }
          .sh-stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.08);
          }
          .sh-stat-card::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 80px;
            height: 80px;
            border-radius: 0 20px 0 80px;
            opacity: 0.06;
            pointer-events: none;
          }
          .sh-stat-card.orange::after { background: #f97316; }
          .sh-stat-card.blue::after { background: #3b82f6; }
          .sh-stat-card.green::after { background: #22c55e; }
          .sh-stat-card.purple::after { background: #a855f7; }
          .sh-stat-card.yellow::after { background: #eab308; }
          .sh-stat-card.cyan::after { background: #06b6d4; }
          .sh-stat-icon {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
          }
          .sh-stat-card.orange .sh-stat-icon { background: #fff7ed; color: #ea580c; }
          .sh-stat-card.blue .sh-stat-icon { background: #eff6ff; color: #2563eb; }
          .sh-stat-card.green .sh-stat-icon { background: #f0fdf4; color: #16a34a; }
          .sh-stat-card.purple .sh-stat-icon { background: #faf5ff; color: #9333ea; }
          .sh-stat-card.yellow .sh-stat-icon { background: #fefce8; color: #ca8a04; }
          .sh-stat-card.cyan .sh-stat-icon { background: #ecfeff; color: #0891b2; }
          .sh-stat-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--gray-500);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .sh-stat-value {
            font-size: 1.75rem;
            font-weight: 900;
            color: var(--gray-900);
            margin-top: 0.25rem;
            letter-spacing: -0.02em;
          }

          /* Main Grid */
          .sh-main-grid {
            display: grid;
            grid-template-columns: 1.6fr 1fr;
            gap: 1.5rem;
            align-items: start;
          }

          /* Cards */
          .sh-card {
            background: white;
            border: 1px solid var(--gray-200);
            border-radius: 20px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          }
          .sh-card-title {
            font-size: 1rem;
            font-weight: 900;
            color: var(--gray-900);
            margin: 0 0 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .sh-card-title i { color: var(--primary); font-size: 0.95rem; }
          .sh-card-subtitle {
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--gray-500);
            margin: 0 0 1rem;
          }

          /* Quick Actions */
          .sh-actions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
          .sh-action-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border-radius: 16px;
            border: 1px solid var(--gray-200);
            background: var(--gray-50);
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
            font-family: inherit;
          }
          .sh-action-btn:hover {
            background: #fff7ed;
            border-color: var(--primary-light);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(249,115,22,0.08);
          }
          .sh-action-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            font-size: 1rem;
            flex-shrink: 0;
          }
          .sh-action-label {
            font-size: 0.8125rem;
            font-weight: 800;
            color: var(--gray-800);
          }
          .sh-action-desc {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--gray-500);
            margin-top: 0.125rem;
          }

          /* Recent Bookings Table */
          .sh-table-wrap {
            border: 1px solid var(--gray-200);
            border-radius: 16px;
            overflow: hidden;
            margin-top: 0.5rem;
          }
          .sh-table {
            width: 100%;
            border-collapse: collapse;
          }
          .sh-table th,
          .sh-table td {
            padding: 0.75rem 1rem;
            text-align: left;
            font-size: 0.8125rem;
            font-weight: 700;
            border-bottom: 1px solid var(--gray-100);
          }
          .sh-table th {
            background: var(--gray-50);
            color: var(--gray-500);
            font-size: 0.6875rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sh-table td {
            color: var(--gray-700);
          }
          .sh-table tbody tr:hover {
            background: #fffaf5;
          }
          .sh-table tbody tr:last-child td {
            border-bottom: none;
          }
          .sh-booking-status {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.625rem;
            border-radius: 999px;
            font-size: 0.6875rem;
            font-weight: 800;
          }
          .sh-booking-status.pending { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
          .sh-booking-status.approved { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .sh-booking-status.completed { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
          .sh-booking-status.rejected { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
          .sh-booking-status.cancelled { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

          /* Approval Status Banner */
          .sh-approval-banner {
            border-radius: 16px;
            padding: 1rem 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            font-weight: 700;
            font-size: 0.875rem;
          }
          .sh-approval-banner i { font-size: 1.1rem; }
          .sh-approval-banner.pending-banner {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            color: #9a3412;
          }
          .sh-approval-banner.rejected-banner {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }

          /* Profile Overview */
          .sh-profile-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.625rem;
          }
          .sh-profile-item {
            padding: 0.625rem 0.75rem;
            background: var(--gray-50);
            border-radius: 12px;
            border: 1px solid var(--gray-100);
          }
          .sh-profile-key {
            font-size: 0.625rem;
            font-weight: 800;
            color: var(--gray-400);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sh-profile-val {
            font-size: 0.8125rem;
            font-weight: 700;
            color: var(--gray-800);
            margin-top: 0.15rem;
            word-break: break-word;
          }

          /* Empty state */
          .sh-empty {
            text-align: center;
            padding: 2rem 1rem;
            color: var(--gray-400);
          }
          .sh-empty i {
            font-size: 2rem;
            margin-bottom: 0.75rem;
            display: block;
          }

          /* Responsive */
          @media (max-width: 900px) {
            .sh-main-grid {
              grid-template-columns: 1fr;
            }
            .sh-stats-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 640px) {
            .sh-stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            .sh-actions-grid {
              grid-template-columns: 1fr;
            }
            .sh-hero {
              padding: 1.5rem 1rem;
            }
            .sh-content {
              padding: 1rem;
            }
            .sh-profile-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {/* Hero Banner */}
        <div className="sh-hero">
          <div className="sh-hero-inner">
            <div className="sh-avatar">
              {displayAvatar ? (
                <img src={displayAvatar} alt="avatar" />
              ) : (
                <span className="sh-avatar-fallback">{getInitials(displayName)}</span>
              )}
            </div>
            <div className="sh-welcome-text">
              <div className="sh-greeting">Welcome back</div>
              <h1 className="sh-name">{displayName}</h1>
              <div className="sh-email">{user?.email || ''}</div>
              <div className="sh-hero-badges">
                <span className="sh-badge grade">
                  <i className="fas fa-chart-line" /> {gradingLabel}
                </span>
                <span className="sh-badge rating">
                  <i className="fas fa-star" /> {averageRating.toFixed(1)} Rating
                </span>
                <span className="sh-badge xp">
                  <i className="fas fa-bolt" /> {xp} XP
                </span>
                <span className="sh-badge tier">
                  <i className="fas fa-crown" /> {tierLevel}
                </span>
                <span
                  className="sh-badge"
                  style={{
                    background: `${statusStyle.bg}dd`,
                    borderColor: statusStyle.border,
                    color: statusStyle.color
                  }}
                >
                  <i className="fas fa-circle" style={{ fontSize: '0.4rem' }} /> {approvalStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="sh-content">
          {/* Approval warning */}
          {approvalStatus === 'pending' && (
            <div className="sh-approval-banner pending-banner">
              <i className="fas fa-clock" />
              Your account is pending approval by the Ecosystem Manager. Some features may be limited until approved.
            </div>
          )}
          {approvalStatus === 'rejected' && (
            <div className="sh-approval-banner rejected-banner">
              <i className="fas fa-exclamation-triangle" />
              Your account has been rejected. Please contact support or update your profile and reapply.
            </div>
          )}

          {/* Stats */}
          <div className="sh-stats-grid">
            <div className="sh-stat-card orange">
              <div className="sh-stat-icon"><i className="fas fa-calendar-alt" /></div>
              <div className="sh-stat-label">Total Bookings</div>
              <div className="sh-stat-value">{bookingsLoading ? '—' : stats.total}</div>
            </div>
            <div className="sh-stat-card blue">
              <div className="sh-stat-icon"><i className="fas fa-hourglass-half" /></div>
              <div className="sh-stat-label">Pending</div>
              <div className="sh-stat-value">{bookingsLoading ? '—' : stats.pending}</div>
            </div>
            <div className="sh-stat-card green">
              <div className="sh-stat-icon"><i className="fas fa-check-circle" /></div>
              <div className="sh-stat-label">Completed</div>
              <div className="sh-stat-value">{bookingsLoading ? '—' : stats.completed}</div>
            </div>
            <div className="sh-stat-card yellow">
              <div className="sh-stat-icon"><i className="fas fa-star" /></div>
              <div className="sh-stat-label">Avg Rating</div>
              <div className="sh-stat-value">{averageRating.toFixed(1)}</div>
            </div>
            <div className="sh-stat-card cyan">
              <div className="sh-stat-icon"><i className="fas fa-award" /></div>
              <div className="sh-stat-label">Grade</div>
              <div className="sh-stat-value">{grading}</div>
            </div>
            <div className="sh-stat-card purple">
              <div className="sh-stat-icon"><i className="fas fa-bolt" /></div>
              <div className="sh-stat-label">XP Points</div>
              <div className="sh-stat-value">{xp}</div>
            </div>
          </div>

          <div className="sh-main-grid">
            {/* Left Column */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Quick Actions */}
              <div className="sh-card">
                <div className="sh-card-title"><i className="fas fa-th-large" /> Quick Actions</div>
                <div className="sh-card-subtitle">Navigate to key areas of your account</div>
                <div className="sh-actions-grid">
                  <button
                    type="button"
                    className="sh-action-btn"
                    onClick={() => (window.location.hash = 'profile')}
                  >
                    <div className="sh-action-icon"><i className="fas fa-user" /></div>
                    <div>
                      <div className="sh-action-label">My Profile</div>
                      <div className="sh-action-desc">View & edit details</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="sh-action-btn"
                    onClick={() => (window.location.hash = 'supplier-bookings')}
                  >
                    <div className="sh-action-icon"><i className="fas fa-calendar-check" /></div>
                    <div>
                      <div className="sh-action-label">My Bookings</div>
                      <div className="sh-action-desc">Manage appointments</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="sh-action-btn"
                    onClick={() => (window.location.hash = 'profile#pricelist')}
                  >
                    <div className="sh-action-icon"><i className="fas fa-tags" /></div>
                    <div>
                      <div className="sh-action-label">Price List</div>
                      <div className="sh-action-desc">Set your service rates</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="sh-action-btn"
                    onClick={() => (window.location.hash = 'supplier-feedback-summary')}
                  >
                    <div className="sh-action-icon"><i className="fas fa-chart-bar" /></div>
                    <div>
                      <div className="sh-action-label">Feedback Summary</div>
                      <div className="sh-action-desc">Customer reviews</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="sh-card">
                <div className="sh-card-title"><i className="fas fa-history" /> Recent Bookings</div>
                <div className="sh-card-subtitle">Your latest booking activity</div>
                {bookingsLoading ? (
                  <div className="sh-empty">
                    <i className="fas fa-spinner fa-pulse" />
                    Loading bookings...
                  </div>
                ) : recentBookings.length > 0 ? (
                  <div className="sh-table-wrap">
                    <table className="sh-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Service</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentBookings.map(b => (
                          <tr key={b.id || b._id}>
                            <td>{b.customer?.fullName || 'Customer'}</td>
                            <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {Array.isArray(b.services) && b.services.length
                                ? b.services.join(', ')
                                : b.serviceTitle || b.service || '—'}
                            </td>
                            <td>{b.requestedDate || '—'}</td>
                            <td>
                              <span className={`sh-booking-status ${b.status || 'pending'}`}>
                                <i className="fas fa-circle" style={{ fontSize: '0.35rem' }} />
                                {b.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="sh-empty">
                    <i className="fas fa-calendar-times" />
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>No bookings yet</div>
                    <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      Once customers book your services, they'll appear here.
                    </div>
                  </div>
                )}
                {recentBookings.length > 0 && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => (window.location.hash = 'supplier-bookings')}
                      style={{
                        background: 'none',
                        border: '1px solid var(--gray-300)',
                        borderRadius: 999,
                        padding: '0.5rem 1.25rem',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                        color: 'var(--primary-dark)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s'
                      }}
                    >
                      View All Bookings <i className="fas fa-arrow-right" style={{ marginLeft: 4, fontSize: '0.7rem' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Profile Overview */}
              <div className="sh-card">
                <div className="sh-card-title"><i className="fas fa-id-card" /> Profile Overview</div>
                <div className="sh-card-subtitle">Your current details at a glance</div>
                <div className="sh-profile-grid">
                  <div className="sh-profile-item">
                    <div className="sh-profile-key">Phone</div>
                    <div className="sh-profile-val">{user?.phone || '—'}</div>
                  </div>
                  <div className="sh-profile-item">
                    <div className="sh-profile-key">City</div>
                    <div className="sh-profile-val">{user?.city || '—'}</div>
                  </div>
                  <div className="sh-profile-item">
                    <div className="sh-profile-key">Category</div>
                    <div className="sh-profile-val">
                      {user?.category || user?.serviceCategory || '—'}
                    </div>
                  </div>
                  <div className="sh-profile-item">
                    <div className="sh-profile-key">Experience</div>
                    <div className="sh-profile-val">
                      {user?.yearsOfExperience ?? 0} yrs {user?.monthsOfExperience ?? 0} mos
                    </div>
                  </div>
                  <div className="sh-profile-item" style={{ gridColumn: 'span 2' }}>
                    <div className="sh-profile-key">Services</div>
                    <div className="sh-profile-val">
                      {Array.isArray(user?.services) && user.services.length
                        ? user.services.join(', ')
                        : '—'}
                    </div>
                  </div>
                  <div className="sh-profile-item" style={{ gridColumn: 'span 2' }}>
                    <div className="sh-profile-key">NIC</div>
                    <div className="sh-profile-val">{user?.nic || '—'}</div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => (window.location.hash = 'profile')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: 'white',
                      border: 'none',
                      borderRadius: 14,
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(249,115,22,0.25)',
                    }}
                  >
                    <i className="fas fa-pen" style={{ marginRight: 6 }} /> Edit Profile
                  </button>
                </div>
              </div>

              {/* Alerts / Notifications Summary */}
              <div className="sh-card">
                <div className="sh-card-title"><i className="fas fa-bell" /> Notifications</div>
                <div className="sh-card-subtitle">Recent alerts at a glance</div>
                <div style={{ display: 'grid', gap: '0.625rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 14,
                    background: stats.pendingComplaints > 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${stats.pendingComplaints > 0 ? '#fecaca' : '#bbf7d0'}`
                  }}>
                    <i
                      className={`fas ${stats.pendingComplaints > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}
                      style={{ color: stats.pendingComplaints > 0 ? '#dc2626' : '#16a34a', fontSize: '1rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: stats.pendingComplaints > 0 ? '#991b1b' : '#166534' }}>
                        {stats.pendingComplaints > 0 ? `${stats.pendingComplaints} pending complaint${stats.pendingComplaints > 1 ? 's' : ''}` : 'No pending complaints'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 14,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe'
                  }}>
                    <i className="fas fa-star" style={{ color: '#2563eb', fontSize: '1rem' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#1e40af' }}>
                        {stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''} received
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 14,
                    background: stats.approved > 0 ? '#fff7ed' : '#f8fafc',
                    border: `1px solid ${stats.approved > 0 ? '#fed7aa' : '#e2e8f0'}`
                  }}>
                    <i className="fas fa-thumbs-up" style={{ color: stats.approved > 0 ? '#ea580c' : '#64748b', fontSize: '1rem' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: stats.approved > 0 ? '#9a3412' : '#475569' }}>
                        {stats.approved} booking{stats.approved !== 1 ? 's' : ''} awaiting service
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SupplierHomePage;
