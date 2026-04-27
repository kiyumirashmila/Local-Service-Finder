import { useState } from "react";

const initialState = {
  title: "",
  providerName: "",
  category: "",
  location: "",
  contact: "",
  description: ""
};

function ServiceForm({ onCreate, loading }) {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onCreate(formData);
    setFormData(initialState);
  };

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <h2>Add New Service</h2>
      <input name="title" placeholder="Service title" value={formData.title} onChange={handleChange} required />
      <input
        name="providerName"
        placeholder="Provider name"
        value={formData.providerName}
        onChange={handleChange}
        required
      />
      <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} required />
      <input name="location" placeholder="Location" value={formData.location} onChange={handleChange} required />
      <input name="contact" placeholder="Contact" value={formData.contact} onChange={handleChange} required />
      <textarea
        name="description"
        placeholder="Description (optional)"
        value={formData.description}
        onChange={handleChange}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add Service"}
      </button>
    </form>
  );
}

export default ServiceForm;
