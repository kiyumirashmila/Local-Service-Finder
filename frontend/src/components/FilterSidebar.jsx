import React from 'react';

const getCategoryIcon = (categoryName = '') => {
  const c = String(categoryName).toLowerCase();
  if (c.includes('plumb')) return 'fa-wrench';
  if (c.includes('elect')) return 'fa-bolt';
  if (c.includes('mechanic') || c.includes('car') || c.includes('bike')) return 'fa-car';
  if (c.includes('carpenter') || c.includes('wood')) return 'fa-hammer';
  if (c.includes('clean')) return 'fa-broom';
  return 'fa-tag';
};

const FilterSidebar = ({ filters, onFilterChange, onReset, categories = [] }) => {
  return (
    <aside className="filters-sidebar">
      <div className="filter-group">
        <h3><i className="fas fa-search"></i> Search</h3>
        <input
          type="text"
          className="search-input"
          placeholder="Search services..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>
      <div className="filter-group">
        <h3><i className="fas fa-tags"></i> Categories</h3>
        <div className="category-list">
          <div
            className={`category-item ${filters.category === 'All' ? 'active' : ''}`}
            onClick={() => onFilterChange('category', 'All')}
          >
            <i className="fas fa-th-large"></i>
            <span>All Services</span>
          </div>
          {categories.map((cat) => {
            const name = typeof cat === 'string' ? cat : cat?.name;
            const icon = typeof cat === 'string' ? getCategoryIcon(cat) : cat?.icon || getCategoryIcon(name);
            if (!name) return null;

            return (
              <div
                key={name}
                className={`category-item ${filters.category === name ? 'active' : ''}`}
                onClick={() => onFilterChange('category', name)}
              >
                <i className={`fas ${icon}`}></i>
                <span>{name}</span>
              </div>
            );
          })}

          {!categories.length && (
            <div className="category-item" style={{ cursor: 'default', opacity: 0.7 }}>
              <i className="fas fa-spinner" aria-hidden="true"></i>
              <span>Loading categories...</span>
            </div>
          )}
        </div>
      </div>
      <div className="filter-group">
        <h3><i className="fas fa-map-marker-alt"></i> Location</h3>
        <input
          type="text"
          className="search-input"
          placeholder="Enter city or area..."
          value={filters.location}
          onChange={(e) => onFilterChange('location', e.target.value)}
        />
      </div>
      <button className="reset-btn" onClick={onReset}>
        <i className="fas fa-redo-alt"></i> Reset All Filters
      </button>
    </aside>
  );
};

export default FilterSidebar;