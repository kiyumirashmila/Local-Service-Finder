import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" id="support">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon" aria-hidden="true">
                <i className="fas fa-tools"></i>
              </div>
              <div className="footer-logo-text">
                Servi<span>Connect</span>
              </div>
            </div>

            <p className="footer-tagline">
              Connecting you with trusted local professionals for home repairs, cleaning, IT, and more.
            </p>

            <div className="footer-badges" aria-label="Highlights">
              <span className="footer-badge">
                <i className="fas fa-shield-alt" aria-hidden="true"></i> Verified Pros
              </span>
              <span className="footer-badge">
                <i className="fas fa-bolt" aria-hidden="true"></i> Fast Booking
              </span>
              <span className="footer-badge">
                <i className="fas fa-lock" aria-hidden="true"></i> Secure Payments
              </span>
            </div>
          </div>

          <div className="footer-grid">
            <div className="footer-col">
              <h4>Quick Links</h4>
              <a href="#home">Home</a>
              <a href="#explore">Explore</a>
              <a href="#bookings">Bookings</a>
              <a href="#support">Support</a>
            </div>

            <div className="footer-col">
              <h4>For Providers</h4>
              <a href="#support">How it Works</a>
              <a href="#support">Pricing</a>
            </div>

            <div className="footer-col">
              <h4>Help</h4>
              <a href="#support">FAQ</a>
              <a href="#support">Contact Us</a>
              <a href="#support">Terms & Privacy</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© {year} ServiConnect. All rights reserved.</p>
          <p className="footer-meta">
            Need assistance? Scroll here anytime for support.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

