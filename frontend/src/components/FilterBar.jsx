function FilterBar({ filters, onChange, onSearch }) {
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <form className="card filter-grid" onSubmit={handleSubmit}>
      <h2>Find Services</h2>
      <input
        name="search"
        placeholder="Search title / provider / description"
        value={filters.search}
        onChange={handleInputChange}
      />
      <input name="category" placeholder="Category" value={filters.category} onChange={handleInputChange} />
      <input name="location" placeholder="Location" value={filters.location} onChange={handleInputChange} />
      <button type="submit">Search</button>
    </form>
  );
}

export default FilterBar;
