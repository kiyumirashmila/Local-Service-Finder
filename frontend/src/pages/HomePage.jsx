import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useServices } from '../hooks/useServices';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginPage from '../components/LoginPage';
import SignupPage from '../components/SignupPage';
import UserProfilePage from '../components/UserProfilePage';
import SupplierProfilePage from '../components/SupplierProfilePage';
import SupplierFeedbackSummaryPage from '../components/SupplierFeedbackSummaryPage';
import AdminDashboardPage from '../components/admin/AdminDashboardPage';
import Admin2DashboardPage from '../components/admin/Admin2DashboardPage';
import BookingPage from '../components/BookingPage';
import SupplierBookingsPage from '../components/SupplierBookingsPage';
import CustomerMyBookingPage from '../components/admin/CustomerMyBookingPage';
import PaymentPage from '../components/admin/PaymentPage';
import ScratchCardTestPage from '../components/ScratchCardTestPage';
import SupplierHomePage from './SupplierHomePage';

import '../styles/HomePage.css';
import { fetchDiscountBanner, fetchRecentSuppliers, fetchGradingConfig, fetchPublicCatalogOptions } from '../services/api';
import { ensureCatalogDefaults, getCatalog } from '../utils/catalogStore';

const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

const HomePage = () => {
  const { user, isAuthenticated, login, logout } = useContext(AuthContext);

  const getRouteFromHash = () => {
    const h = String(window.location.hash || '').replace('#', '').toLowerCase();
    if (h === 'login') return 'login';
    if (h === 'signup') return 'signup';
    if (h === 'profile') return 'profile';
    if (h === 'supplier-feedback-summary') return 'supplier-feedback-summary';
    if (h === 'admin') return 'admin';
    if (h === 'admin2') return 'admin2';
    if (h.startsWith('booking')) return 'booking';
    if (h === 'supplier-overview') return 'supplier-overview';
    if (h.startsWith('supplier-bookings')) return 'supplier-bookings';
    if (h === 'my-bookings') return 'my-bookings';
    if (h === 'payment') return 'payment';
    if (h === 'scratch-test') return 'scratch-test';
    if (h === 'supplier-home') return 'supplier-home';
    return 'home';
  };

  const [route, setRoute] = useState(() => getRouteFromHash());
  const [bookingService, setBookingService] = useState(() => {
    try {
      const raw = sessionStorage.getItem('bookingService');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [supplierOverview, setSupplierOverview] = useState(() => {
    try {
      const raw = sessionStorage.getItem('supplierOverview');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [recentSuppliers, setRecentSuppliers] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState('');
  const [gradingConfig, setGradingConfig] = useState(null);
  const [gradingSort, setGradingSort] = useState('all');
  const [promoBanner, setPromoBanner] = useState(null);

  const { services, loading, error, filters, updateFilter, resetFilters } = useServices({
    search: '',
    category: 'All',
    location: '',
  });

  const userDistrict = String(user?.district || '').trim().toLowerCase();

  const [catalogCategories, setCatalogCategories] = useState([]);
  const categories = useMemo(() => {
    const fromServices = services.map((s) => s.category).filter(Boolean);
    const unique = Array.from(new Set([...fromServices, ...catalogCategories]));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [services, catalogCategories]);

  const categoryOptions = useMemo(() => ['All', ...categories], [categories]);
  const tileCategories = useMemo(() => ['All', ...categories], [categories]);

  // ---------- HERO SLIDER WITH LOCAL IMAGES ----------
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSlides = useMemo(() => [
    {
      id: 1,
      title: "Expert Home Services",
      subtitle: "From plumbing to cleaning, find trusted professionals near you",
      cta: "Find a Pro",
      image: "/images/1.jpg",
      bgGradient: "linear-gradient(135deg, rgba(39,24,126,0.65) 0%, rgba(117,139,253,0.65) 100%)"
    },
    {
      id: 2,
      title: "Fast & Reliable Service",
      subtitle: "Get matched with available professionals in minutes",
      cta: "Book Now",
      image: "/images/2.jpg",
      bgGradient: "linear-gradient(135deg, rgba(0,129,167,0.65) 0%, rgba(0,175,185,0.65) 100%)"
    },
    {
      id: 3,
      title: "Event-Ready Professionals",
      subtitle: "Perfect for parties, gatherings, and special occasions",
      cta: "Plan Event",
      image: "/images/3.jpg",
      bgGradient: "linear-gradient(135deg, rgba(240,113,103,0.65) 0%, rgba(254,217,183,0.65) 100%)"
    },
    {
      id: 4,
      title: "Skilled & Verified",
      subtitle: "Background-checked experts you can trust with your home",
      cta: "Explore",
      image: "/images/4.jpg",
      bgGradient: "linear-gradient(135deg, rgba(39,24,126,0.65) 0%, rgba(0,129,167,0.65) 100%)"
    },
    {
      id: 5,
      title: "24/7 Emergency Support",
      subtitle: "Round-the-clock assistance for urgent home repairs",
      cta: "Call Now",
      image: "/images/5.jpg",
      bgGradient: "linear-gradient(135deg, rgba(255,134,0,0.65) 0%, rgba(254,217,183,0.65) 100%)"
    }
  ], []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // ---------- STICKY SEARCH BAR ----------
  const [isSearchSticky, setIsSearchSticky] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY && currentScrollY > 80) {
        setIsSearchSticky(true);
      } else if (currentScrollY <= 80) {
        setIsSearchSticky(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // ---------- FILTER LOGIC ----------
  const { recommendedSuppliers, otherSuppliers } = useMemo(() => {
    let rows = [...recentSuppliers];

    if (gradingSort !== 'all') {
      rows = rows.filter((s) => String(s.supplierGrading || '') === gradingSort);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (s) =>
          (s.fullName || '').toLowerCase().includes(q) ||
          (s.serviceCategory || '').toLowerCase().includes(q) ||
          (s.services || []).some((srv) => srv.toLowerCase().includes(q))
      );
    }
    if (filters.category && filters.category !== 'All') {
      const cat = filters.category.toLowerCase();
      rows = rows.filter((s) => {
        const sCat = (s.serviceCategory || '').toLowerCase();
        const sCatOther = (s.serviceCategoryOther || '').toLowerCase();
        if (sCat === cat || sCatOther === cat) return true;
        if ((s.services || []).some((srv) => srv.toLowerCase().includes(cat))) return true;
        return false;
      });
    }
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      rows = rows.filter((s) => (s.city || '').toLowerCase().includes(loc));
    }

    const order = { A: 0, B: 1, C: 2 };
    const sortByGrading = (arr) => [...arr].sort((a, b) => (order[a.supplierGrading] ?? 9) - (order[b.supplierGrading] ?? 9));

    if (isAuthenticated && userDistrict) {
      const recommended = rows.filter((s) => String(s.district || '').trim().toLowerCase() === userDistrict);
      const other = rows.filter((s) => String(s.district || '').trim().toLowerCase() !== userDistrict);
      return { recommendedSuppliers: sortByGrading(recommended), otherSuppliers: sortByGrading(other) };
    }

    return { recommendedSuppliers: sortByGrading(rows), otherSuppliers: [] };
  }, [recentSuppliers, gradingSort, filters.search, filters.category, filters.location, isAuthenticated, userDistrict]);

  const [draftSearch, setDraftSearch] = useState(filters.search || '');
  const [draftCategory, setDraftCategory] = useState(filters.category || 'All');
  const [draftLocation, setDraftLocation] = useState(filters.location || '');

  useEffect(() => {
    setDraftSearch(filters.search || '');
    setDraftCategory(filters.category || 'All');
    setDraftLocation(filters.location || '');
  }, [filters.search, filters.category, filters.location]);

  const handleBook = (service) => {
    if (!service) return;
    setBookingService(service);
    sessionStorage.setItem('bookingService', JSON.stringify(service));
    window.location.hash = 'booking';
  };

  const handleViewProfile = (supplier) => {
    if (!supplier) return;
    setSupplierOverview(supplier);
    sessionStorage.setItem('supplierOverview', JSON.stringify(supplier));
    window.location.hash = 'supplier-overview';
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    updateFilter('search', draftSearch);
    updateFilter('category', draftCategory);
    updateFilter('location', draftLocation);
  };

  const handleCategoryClick = (cat) => {
    updateFilter('category', cat);
    const el = document.getElementById('bookings');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePromoBook = () => {
    const cleaning = categories.includes('Cleaning') ? 'Cleaning' : categories[0] || 'All';
    updateFilter('category', cleaning);
    const el = document.getElementById('bookings');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLoginClick = () => {
    window.location.hash = 'login';
  };

  const handleSignupClick = () => {
    window.location.hash = 'signup';
  };
  const handleAddServiceClick = () => { };
  const handleProfileClick = () => {
    window.location.hash = 'profile';
  };

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const load = async () => {
      setRecentError('');
      setRecentLoading(true);
      try {
        const [supRes, catRes, promoRes] = await Promise.all([
          fetchRecentSuppliers('all'),
          fetchPublicCatalogOptions().catch(() => null),
          fetchDiscountBanner().catch(() => null)
        ]);
        setRecentSuppliers(supRes?.data?.suppliers || []);
        if (catRes?.data?.categories) {
          setCatalogCategories(catRes.data.categories);
        }
        setPromoBanner(promoRes?.data?.promo || null);
      } catch (e) {
        setRecentError(e?.response?.data?.message || 'Failed to load suppliers.');
      } finally {
        setRecentLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'supplier' && route === 'home') {
      window.location.hash = 'supplier-home';
      return;
    }
    if (
      isAuthenticated &&
      route !== 'home' &&
      route !== 'profile' &&
      route !== 'supplier-feedback-summary' &&
      route !== 'admin' &&
      route !== 'admin2' &&
      route !== 'booking' &&
      route !== 'supplier-overview' &&
      route !== 'supplier-bookings' &&
      route !== 'my-bookings' &&
      route !== 'payment' &&
      route !== 'scratch-test' &&
      route !== 'supplier-home' &&
      route !== 'login' &&
      route !== 'signup'
    ) {
      window.location.hash = 'home';
    }
  }, [isAuthenticated, route, user?.role]);

  const renderSupplierGrid = (suppliers) => (
    <div className="recommended-grid">
      {suppliers.map((s) => {
        const serviceCategory =
          s.serviceCategory === 'other' && s.serviceCategoryOther
            ? `Other (${s.serviceCategoryOther})`
            : s.serviceCategory;

        const displayServices =
          s.services && s.services.length > 0
            ? s.services.join(', ')
            : serviceCategory;

        const bookingPayload = {
          supplierId: s.id,
          providerName: s.fullName,
          category: serviceCategory || 'Local Professional',
          title: displayServices ? `${displayServices}` : 'Service',
          services: Array.isArray(s.services) ? s.services : [],
          location: s.city || '',
          district: s.district || '',
          experience: `${s.yearsOfExperience ?? 0} Years`,
          avatarUrl: s.avatar || s.avatarUrl || '',
          servicesRates: s.servicesRates || {}
        };

        return (
          <article key={s.id} className="recommended-card">
            <div className="rec-avatar" aria-label={`${s.fullName || 'Supplier'} profile picture`}>
              {s.avatar || s.avatarUrl ? (
                <img src={s.avatar || s.avatarUrl} alt={s.fullName || 'Supplier'} />
              ) : (
                <span aria-hidden="true">{s.fullName?.charAt(0) || 'S'}</span>
              )}
            </div>
            <div className="rec-body">
              <div className="rec-provider">{s.fullName}</div>
              <div className="rec-category-name">{serviceCategory || 'Local Professional'}</div>
              <div className="rec-meta">
                <span className="rec-pill" title="Average Rating">
                  <i className="fas fa-star" style={{ color: '#facc15' }} aria-hidden="true"></i>{' '}
                  {s.averageRating > 0 ? s.averageRating.toFixed(1) : 'No Ratings'} ({s.totalRatings || 0})
                </span>
                {s.supplierGrading && gradingConfig?.[s.supplierGrading] && (
                  <span className="rec-pill" title="Grading tier">
                    <i className="fas fa-award" aria-hidden="true"></i>{' '}
                    {gradingConfig[s.supplierGrading].label || `Grade ${s.supplierGrading}`}
                  </span>
                )}
                {s.city && (
                  <span className="rec-pill">
                    <i className="fas fa-map-marker-alt" aria-hidden="true"></i> {s.city}
                  </span>
                )}
                {Number.isFinite(s.yearsOfExperience) && (
                  <span className="rec-pill">
                    <i className="fas fa-briefcase" aria-hidden="true"></i> {s.yearsOfExperience} yrs
                  </span>
                )}
              </div>

              <div className="rec-actions">
                <button className="view-profile-button" type="button" onClick={() => handleViewProfile(bookingPayload)}>
                  <i className="fas fa-user" aria-hidden="true"></i> View Profile
                </button>
                <button className="book-button" type="button" onClick={() => handleBook(bookingPayload)}>
                  <i className="fas fa-calendar-check" aria-hidden="true"></i> Book
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  // ==================== ROUTE HANDLERS ====================
  if (route === 'login') {
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh' }}>
          <LoginPage
            onSuccess={(loggedInUser) => {
              const email = String(loggedInUser?.email || '').toLowerCase();
              if (email === 'admin2@admin.com') window.location.hash = 'admin2';
              else if (loggedInUser?.role === 'admin') window.location.hash = 'admin';
              else if (loggedInUser?.role === 'supplier') window.location.hash = 'supplier-home';
              else window.location.hash = 'home';
            }}
            onCancel={() => {
              window.location.hash = 'home';
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'signup') {
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh' }}>
          <SignupPage
            onSuccess={() => {
              window.location.hash = 'home';
            }}
            onCancel={() => {
              window.location.hash = 'home';
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'profile') {
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh' }}>
          {user?.role === 'supplier' ? (
            <SupplierProfilePage
              onBack={() => {
                window.location.hash = 'supplier-home';
              }}
              onViewFeedbackSummary={() => {
                window.location.hash = 'supplier-feedback-summary';
              }}
            />
          ) : (
            <UserProfilePage
              onBack={() => {
                window.location.hash = 'home';
              }}
            />
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'supplier-feedback-summary') {
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh' }}>
          <SupplierFeedbackSummaryPage
            onBack={() => {
              window.location.hash = 'profile';
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'admin') {
    return (
      <div className="app">
        <AdminDashboardPage />
      </div>
    );
  }

  if (route === 'admin2') {
    return (
      <div className="app">
        <Admin2DashboardPage />
      </div>
    );
  }

  if (route === 'supplier-home') {
    if (!isAuthenticated || user?.role !== 'supplier') {
      window.location.hash = 'home';
      return null;
    }
    return (
      <div className="app">
        <SupplierHomePage />
      </div>
    );
  }

  if (route === 'booking') {
    return (
      <div className="app">
        <BookingPage
          service={bookingService}
          onBack={() => {
            window.location.hash = 'home';
          }}
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
      </div>
    );
  }

  if (route === 'supplier-overview') {
    const p = supplierOverview;
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh', background: '#F1F2F6', padding: '24px 16px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <button
              type="button"
              className="book-button"
              style={{ width: 'auto', padding: '10px 14px', marginBottom: 14 }}
              onClick={() => {
                window.location.hash = 'home';
              }}
            >
              ← Back
            </button>
            <div style={{ background: '#fff', border: '1px solid #AEB8FE', borderRadius: 28, padding: 24 }}>
              <h2 style={{ margin: 0, color: '#27187E' }}>Profile Overview</h2>
              <p style={{ margin: '6px 0 16px', color: '#64748B', fontWeight: 700 }}>
                View supplier profile details before booking.
              </p>
              {!p ? (
                <div style={{ color: '#64748B', fontWeight: 700 }}>Supplier details not available.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ fontSize: 11, color: '#758BFD', fontWeight: 900 }}>Supplier Name</div><div style={{ fontWeight: 700, color: '#1f2937' }}>{p.providerName || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: '#758BFD', fontWeight: 900 }}>Category</div><div style={{ fontWeight: 700, color: '#1f2937' }}>{p.category || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: '#758BFD', fontWeight: 900 }}>Location</div><div style={{ fontWeight: 700, color: '#1f2937' }}>{p.location || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: '#758BFD', fontWeight: 900 }}>Experience</div><div style={{ fontWeight: 700, color: '#1f2937' }}>{p.experience || '—'}</div></div>
                  <div style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, color: '#758BFD', fontWeight: 900 }}>Services</div><div style={{ fontWeight: 700, color: '#1f2937' }}>{Array.isArray(p.services) && p.services.length ? p.services.join(', ') : p.title || '—'}</div></div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'supplier-bookings') {
    return (
      <div className="app">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
        <main style={{ minHeight: '60vh' }}>
          <SupplierBookingsPage
            onBack={() => {
              window.location.hash = 'supplier-home';
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (route === 'my-bookings') {
    return (
      <div className="app">
        <CustomerMyBookingPage
          onBack={() => {
            window.location.hash = 'home';
          }}
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
      </div>
    );
  }

  if (route === 'payment') {
    return (
      <div className="app">
        <PaymentPage
          onBack={() => {
            try {
              sessionStorage.removeItem('paymentBookingId');
            } catch { }
            window.location.hash = 'my-bookings';
          }}
          user={user}
          isAuthenticated={isAuthenticated}
          onAddServiceClick={handleAddServiceClick}
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
      </div>
    );
  }

  if (route === 'scratch-test') {
    return (
      <div className="app">
        <ScratchCardTestPage
          onBack={() => {
            window.location.hash = 'home';
          }}
        />
      </div>
    );
  }

  // ==================== MAIN HOMEPAGE RENDER ====================
  return (
    <div className="app home-page-modern">
      <style>{`
        :root {
          --primary-dark: #27187E;
          --primary: #758BFD;
          --primary-soft: #AEB8FE;
          --bg-main: #F1F2F6;
          --cta: #FF8600;
          --accent-teal: #00AFB9;
          --accent-blue: #0081A7;
          --accent-peach: #FED9B7;
          --accent-coral: #F07167;
          --card-white: #ffffff;
          --gray-100: #EFF2F9;
          --gray-200: #E2E8F0;
          --gray-500: #64748B;
          --gray-700: #334155;
          --gray-900: #0F172A;
          --font-sans: sans-serif;
        }

        .home-page-modern {
          background: var(--bg-main);
          font-family: var(--font-sans);
          font-size: 1.05rem; /* Globally scaled up font size */
        }
        .home-page-modern a,
        .home-page-modern .quick-link,
        .home-page-modern .category-name-modern,
        .home-page-modern .footer-col a,
        .home-page-modern .section-header-modern h2 {
          color: #1e3a8a !important;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .home-page-modern a:hover,
        .home-page-modern .quick-link:hover,
        .home-page-modern .category-circle-modern:hover .category-name-modern,
        .home-page-modern .footer-col a:hover {
          color: #000000 !important;
        }

        /* Convert Book Buttons & CTA's to Navy Blue background */
        .home-page-modern .book-btn,
        .home-page-modern .book-button,
        .home-page-modern .promo-btn-modern,
        .home-page-modern .hero-cta-modern,
        .home-page-modern .btn-primary,
        .home-page-modern .search-button-modern {
          background: #1e3a8a !important;
          color: #ffffff !important;
          border: none;
          transition: all 0.3s ease;
        }
        .home-page-modern .book-btn:hover,
        .home-page-modern .book-button:hover,
        .home-page-modern .promo-btn-modern:hover,
        .home-page-modern .hero-cta-modern:hover,
        .home-page-modern .btn-primary:hover,
        .home-page-modern .search-button-modern:hover {
          background: #000000 !important;
          color: #ffffff !important;
        }

        /* View Profile Button */
        .home-page-modern .view-profile-button {
          color: #1e3a8a !important;
          border: 1px solid #1e3a8a !important;
          background: transparent;
          transition: all 0.3s ease;
        }
        .home-page-modern .view-profile-button:hover {
          color: #000000 !important;
          border-color: #000000 !important;
          background: rgba(0,0,0,0.05); /* Slight accent */
        }

        /* Hero Slider */
        .hero-slider-modern {
          position: relative;
          height: 600px;
          overflow: hidden;
        }
        .hero-slide-modern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
          background-size: cover;
          background-position: center;
          background-color: #27187E;
        }
        .hero-slide-modern.active {
          opacity: 1;
        }
        .hero-overlay-modern {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .hero-content-modern {
          max-width: 800px;
          padding: 2rem;
          color: white;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .hero-title-modern {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          animation: fadeInUp 0.6s ease;
        }
        .hero-subtitle-modern {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          opacity: 0.95;
          animation: fadeInUp 0.6s ease 0.1s both;
        }
        .hero-cta-modern {
          background: var(--cta);
          border: none;
          padding: 0.9rem 2rem;
          border-radius: 50px;
          font-weight: 800;
          font-size: 1rem;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease 0.2s both;
        }
        .hero-cta-modern:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(255,134,0,0.3);
        }
        .slider-dots-modern {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          z-index: 10;
        }
        .slider-dot-modern {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.3s;
        }
        .slider-dot-modern.active {
          width: 30px;
          border-radius: 10px;
          background: var(--cta);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Sticky Search Bar */
        .sticky-search-container {
          position: relative;
          z-index: 100;
        }
        .sticky-search-container.sticky {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          animation: slideDown 0.3s ease-out;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          background: white;
          padding-bottom: 0.5rem;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .search-card-modern {
          background: white;
          border-radius: 60px;
          padding: 0.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .search-field-modern {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: var(--bg-main);
          border-radius: 50px;
          min-width: 180px;
        }
        .search-field-modern i { color: var(--primary-dark); }
        .search-field-modern input, .search-field-modern select {
          border: none;
          background: transparent;
          font-family: var(--font-sans);
          font-size: 0.9rem;
          width: 100%;
          outline: none;
        }
        .search-button-modern {
          background: var(--cta);
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 50px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
        }
        .search-button-modern:hover { background: #e67500; transform: scale(1.02); }

        /* Category Carousel */
        .category-carousel-modern {
          max-width: 1400px;
          margin: 3rem auto;
          padding: 0 1.5rem;
        }
        .carousel-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1.5rem;
        }
        .carousel-title-modern {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary-dark);
        }
        .carousel-track-container-modern { overflow: hidden; }
        .carousel-track-modern {
          display: flex;
          gap: 1.5rem;
          animation: scrollInfinite 40s linear infinite;
          width: fit-content;
        }
        .carousel-track-modern:hover { animation-play-state: paused; }
        @keyframes scrollInfinite {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .category-circle-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .category-circle-modern:hover { transform: scale(1.08); }
        .circle-icon-modern {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--primary-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          transition: all 0.3s;
          color: var(--primary-dark);
        }
        .category-circle-modern:hover .circle-icon-modern {
          border-color: var(--cta);
          box-shadow: 0 10px 25px rgba(255,134,0,0.2);
          color: var(--cta);
        }
        .category-name-modern {
          font-weight: 600;
          color: var(--gray-700);
        }

        /* Promo Banner */
        .promo-banner-modern {
          max-width: 1400px;
          margin: 2rem auto;
          padding: 3rem 4rem;
          background: linear-gradient(90deg, rgba(0, 129, 167, 0.95) 0%, rgba(0, 175, 185, 0.4) 100%), url('/images/offer.jpg') center/cover no-repeat;
          border-radius: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .promo-content-modern h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .promo-code-modern {
          background: var(--cta);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-weight: 800;
          display: inline-block;
          margin-top: 0.5rem;
        }
        .promo-btn-modern {
          background: white;
          color: var(--primary-dark);
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 50px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
        }
        .promo-btn-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        /* Sections */
        .section-modern {
          max-width: 1400px;
          margin: 3rem auto;
          padding: 0 1.5rem;
        }
        .section-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .section-header-modern h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--primary-dark);
        }
        .grading-filter {
          padding: 0.5rem 1rem;
          border-radius: 10px;
          border: 1px solid var(--primary-soft);
          font-weight: 600;
          background: white;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .hero-title-modern { font-size: 2rem; }
          .hero-slider-modern { height: 450px; }
          .search-card-modern { flex-direction: column; border-radius: 30px; }
          .search-field-modern { border-radius: 50px; }
          .carousel-track-modern { animation-duration: 60s; }
        }
        @media (max-width: 640px) {
          .hero-title-modern { font-size: 1.5rem; }
          .hero-subtitle-modern { font-size: 1rem; }
        }

        /* Checkerboard Section */
        .checkerboard-section {
          background-color: #F1F2F6;
          width: 100%;
          padding: 5rem 1.5rem;
        }
        .checkerboard-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .checkerboard-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: stretch;
        }
        .checkerboard-image-wrap {
          width: 100%;
          height: 100%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          min-height: 400px;
        }
        .checkerboard-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .checkerboard-content {
          background-color: #FFFFFF;
          border-radius: 24px;
          padding: 4rem 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
        }
        .checkerboard-content h3 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0f172a; /* Navy blue */
          margin-bottom: 1.5rem;
        }
        .checkerboard-content p {
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--gray-600);
          margin-bottom: 2rem;
        }
        .checkerboard-link {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e3a8a; /* Navy blue */
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        .checkerboard-link:hover {
          color: #000000; /* Black */
          transform: translateX(4px);
        }

        @media (max-width: 900px) {
          .checkerboard-row {
            grid-template-columns: 1fr;
          }
          .checkerboard-content {
            padding: 3rem 2rem;
          }
          .checkerboard-image-wrap {
            min-height: 300px;
          }
        }
      `}</style>

      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onAddServiceClick={handleAddServiceClick}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onLogout={logout}
        onProfileClick={handleProfileClick}
      />

      {/* Hero Slider with your images 1.jpg to 5.jpg */}
      <div className="hero-slider-modern">
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`hero-slide-modern ${idx === heroIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="hero-overlay-modern" style={{ background: slide.bgGradient }}>
              <div className="hero-content-modern">
                <h1 className="hero-title-modern">{slide.title}</h1>
                <p className="hero-subtitle-modern">{slide.subtitle}</p>
                <button
                  className="hero-cta-modern"
                  onClick={slide.cta === "Book Now" ? handlePromoBook : () => document.getElementById('bookings')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {slide.cta} <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="slider-dots-modern">
          {heroSlides.map((_, idx) => (
            <div
              key={idx}
              className={`slider-dot-modern ${idx === heroIndex ? 'active' : ''}`}
              onClick={() => setHeroIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* Sticky Search Bar */}
      <div className={`sticky-search-container ${isSearchSticky ? 'sticky' : ''}`}>
        <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
          <form className="search-card-modern" onSubmit={handleHeroSearch}>
            <div className="search-field-modern">
              <i className="fas fa-search"></i>
              <input
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="What service do you need?"
              />
            </div>
            <div className="search-field-modern">
              <i className="fas fa-list"></i>
              <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)}>
                {categoryOptions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
              </select>
            </div>
            <div className="search-field-modern">
              <i className="fas fa-map-marker-alt"></i>
              <select
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
              >
                <option value="">Any District</option>
                {sriLankaDistricts.map((d) => (
                  <option key={d} value={d.toLowerCase()}>{d}</option>
                ))}
              </select>
            </div>
            <button className="search-button-modern" type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Category Carousel - Infinite Scroll */}
      <div className="category-carousel-modern">
        <div className="carousel-header-modern">
          <h3 className="carousel-title-modern">
            <i className="fas fa-th-large" style={{ color: '#FF8600', marginRight: 8 }}></i>
            Browse Categories
          </h3>
        </div>
        <div className="carousel-track-container-modern">
          <div className="carousel-track-modern">
            {[...tileCategories, ...tileCategories].map((cat, idx) => (
              <div key={idx} className="category-circle-modern" onClick={() => handleCategoryClick(cat)}>
                <div className="circle-icon-modern">
                  <i className={`fas ${getCategoryIcon(cat)}`}></i>
                </div>
                <span className="category-name-modern">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="promo-banner-modern">
        <div className="promo-content-modern">
          <h3>{promoBanner ? `Get ${promoBanner.type === 'percentage' ? `${promoBanner.value}% OFF` : `LKR ${promoBanner.value} OFF`}` : 'Special Offer Available'}</h3>
          <p>{promoBanner ? `Use code: ` : 'Contact admin for promo codes'}</p>
          {promoBanner && <span className="promo-code-modern">{promoBanner.code}</span>}
        </div>
        <button className="promo-btn-modern" onClick={handlePromoBook}>
          Book Now <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Recommended Suppliers Section */}
      <section className="section-modern" id="bookings">
        <div className="section-header-modern">
          <h2>Recommended for You</h2>
          <select className="grading-filter" value={gradingSort} onChange={(e) => setGradingSort(e.target.value)}>
            <option value="all">All Grades</option>
            <option value="A">{gradingConfig?.A?.label || 'Grade A'}</option>
            <option value="B">{gradingConfig?.B?.label || 'Grade B'}</option>
            <option value="C">{gradingConfig?.C?.label || 'Grade C'}</option>
          </select>
        </div>

        {(recentError || error) && <div className="error-banner">{recentError || 'Failed to load suppliers.'}</div>}

        {recentLoading ? (
          <div className="recommended-grid">
            {[1, 2, 3, 4].map(i => <div key={i} className="recommended-card skeleton"><div className="sk-avatar" /><div className="sk-line" /><div className="sk-line short" /></div>)}
          </div>
        ) : recommendedSuppliers.length ? (
          renderSupplierGrid(recommendedSuppliers)
        ) : (
          <div className="empty-state">
            <i className="fas fa-search"></i>
            <h3>No suppliers found</h3>
            <button className="reset-btn" onClick={resetFilters}>Reset Filters</button>
          </div>
        )}
      </section>

      {/* Other Suppliers Section */}
      {isAuthenticated && userDistrict && otherSuppliers.length > 0 && (
        <section className="section-modern">
          <div className="section-header-modern">
            <h2>Other Suppliers</h2>
          </div>
          {renderSupplierGrid(otherSuppliers)}
        </section>
      )}

      {/* Checkerboard Section */}
      <section className="checkerboard-section">
        <div className="checkerboard-container">
          <div className="checkerboard-row">
            <div className="checkerboard-image-wrap">
              <img src="/images/baker.jpg" alt="About Us Baker" className="checkerboard-image" />
            </div>
            <div className="checkerboard-content">
              <h3>About Us</h3>
              <p>We believe in redefining exceptional service through trust, quality, and connection. Our platform brings together skilled professionals who are committed to delivering not just a service, but a seamless experience tailored to your needs. With a focus on reliability and convenience, we make it easier to discover, compare, and connect with the right service providers. Discover how we are transforming local service connections.</p>
              <a href="#about" className="checkerboard-link">Learn More &rarr;</a>
            </div>
          </div>
          <div className="checkerboard-row">
            <div className="checkerboard-content">
              <h3>Our Social Impact</h3>
              <p>Empowering communities is at the heart of our mission. By partnering with local professionals and fostering fair opportunities, we are building a sustainable ecosystem where every connection makes a positive impact in the places we call home.</p>
              <a href="#impact" className="checkerboard-link">Learn More &rarr;</a>
            </div>
            <div className="checkerboard-image-wrap">
              <img src="/images/driver.jpg" alt="Social Impact Delivery Truck" className="checkerboard-image" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;

function getCategoryIcon(categoryName = '') {
  const c = String(categoryName).toLowerCase();

  // Existing
  if (c.includes('plumb')) return 'fa-wrench';
  if (c.includes('clean')) return 'fa-broom';
  if (c.includes('elect')) return 'fa-bolt';
  if (c.includes('hand')) return 'fa-tools';
  if (c.includes('paint')) return 'fa-paint-roller';
  if (c.includes('garden')) return 'fa-leaf';

  // New specific icons requested
  if (c.includes('landscap')) return 'fa-seedling';
  if (c.includes('renting') || c.includes('property')) return 'fa-house-user';
  if (c === 'all') return 'fa-th-large';
  if (c.includes('baber') || c.includes('barber')) return 'fa-cut';
  if (c.includes('beauty')) return 'fa-spa';
  if (c.includes('taxi') || c.includes('transport')) return 'fa-taxi';
  if (c.includes('carpent')) return 'fa-hammer';

  // Fallback to random repeatable generic to prevent single tag repeating everywhere if still missed
  const fallbacks = ['fa-star', 'fa-briefcase', 'fa-cogs', 'fa-box', 'fa-gem'];
  return fallbacks[c.length % fallbacks.length];
}