import React from 'react';

const ServiceCard = ({ service, onBook, onViewProfile }) => {
  const { title, providerName, category, location, contact, experience } = service;

  const getCategoryIcon = (categoryName = '') => {
    const c = String(categoryName).toLowerCase();
    if (c.includes('plumb')) return 'fa-wrench';
    if (c.includes('elect')) return 'fa-bolt';
    if (c.includes('mechanic') || c.includes('car') || c.includes('bike')) return 'fa-car';
    if (c.includes('carpenter') || c.includes('wood')) return 'fa-hammer';
    if (c.includes('clean')) return 'fa-broom';
    return 'fa-tag';
  };

  const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
  const phoneForTel = normalizePhone(contact);

  return (
    <div className="service-card">
      <div className="card-image">
        <i className={`fas ${getCategoryIcon(category)}`}></i>
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <span className="card-category">{category}</span>
        <div className="card-location">
          <i className="fas fa-map-marker-alt"></i> {location}
        </div>

        <div className="provider-section" onClick={() => onViewProfile(providerName)}>
          <div className="provider-avatar-placeholder">{providerName?.charAt(0)}</div>
          <div className="provider-info">
            <div className="provider-name">{providerName}</div>
            <div className="provider-stats">
              {experience && <span><i className="fas fa-briefcase"></i> {experience}</span>}
              {contact && <span><i className="fas fa-phone"></i> {contact}</span>}
            </div>
          </div>
        </div>

        <button
          className="book-btn"
          onClick={() => onBook(service)}
          disabled={!phoneForTel}
          title={phoneForTel ? 'Tap to call' : 'No contact number available'}
        >
          <i className="fas fa-phone-alt"></i> {phoneForTel ? 'Contact' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;