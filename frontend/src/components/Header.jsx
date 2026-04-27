import React from 'react';

const Header = ({
  onAddServiceClick,
  user,
  isAuthenticated,
  onLoginClick,
  onSignupClick,
  onLogout,
  onProfileClick,
}) => {
  const isSupplier = user?.role === 'supplier';
  const isCustomer = !user?.role || user?.role === 'customer';
  const displayName = user?.fullName || user?.name || user?.email || 'My Account';
  const avatarUrl = user?.avatar || user?.avatarUrl || '';

  const quickLinks = [
    { label: 'Home', href: '#home', icon: 'fa-home' },
    { label: 'Explore', href: '#explore', icon: 'fa-compass' },
    isAuthenticated && isCustomer
      ? { label: 'My Bookings', href: '#my-bookings', icon: 'fa-calendar-check' }
      : { label: 'Bookings', href: '#bookings', icon: 'fa-calendar-check' },
    { label: 'Support', href: '#support', icon: 'fa-headset' },
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div
          className="logo"
          role="button"
          tabIndex={0}
          onClick={() => {
            window.location.hash = 'home';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') window.location.hash = 'home';
          }}
          aria-label="Go to home"
        >
          <div className="logo-icon">
            <i className="fas fa-tools"></i>
          </div>
          <span className="logo-text">
            Servi<span>Connect</span>
          </span>
        </div>

        <nav className="quick-links" aria-label="Quick links">
          {quickLinks.map((link) => (
            <a key={link.label} className="quick-link" href={link.href}>
              <i className={`fas ${link.icon}`} aria-hidden="true"></i>
              <span>{link.label}</span>
            </a>
          ))}
        </nav>

        <div className="nav-buttons">
          {!isAuthenticated ? (
            <>
              <button className="btn-outline" onClick={onLoginClick}>
                <i className="fas fa-sign-in-alt"></i> Login
              </button>
              <button className="btn-primary" onClick={onSignupClick}>
                <i className="fas fa-user-plus"></i> Sign Up
              </button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={onProfileClick}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="profile" className="profile-avatar-small" />
                ) : (
                  <i className="fas fa-user profile-avatar-small" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                )}
                <span>{displayName}</span>
              </button>
              {isSupplier && (
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    window.location.hash = 'supplier-bookings';
                  }}
                  title="Booking requests"
                >
                  <i className="fas fa-inbox"></i> Requests
                </button>
              )}

              <button className="btn-secondary" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;


