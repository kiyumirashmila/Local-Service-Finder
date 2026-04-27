function ServiceList({ services, loading }) {
  if (loading) return <p>Loading services...</p>;
  if (!services.length) return <p>No services found.</p>;

  return (
    <div className="service-list">
      {services.map((service) => (
        <article className="card service-card" key={service._id}>
          <h3>{service.title}</h3>
          <p>
            <strong>Provider:</strong> {service.providerName}
          </p>
          <p>
            <strong>Category:</strong> {service.category}
          </p>
          <p>
            <strong>Location:</strong> {service.location}
          </p>
          <p>
            <strong>Contact:</strong> {service.contact}
          </p>
          {service.description && (
            <p>
              <strong>Description:</strong> {service.description}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export default ServiceList;
