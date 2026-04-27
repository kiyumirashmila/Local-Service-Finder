import ServiceCard from './ServiceCard';

const ServicesGrid = ({ services, onBook, onViewProfile, loading }) => {
  if (loading) return <div className="loading">Loading services...</div>;
  if (!services.length) return <div className="empty">No services found.</div>;

  return (
    <div className="services-grid">
      {services.map(service => (
        <ServiceCard key={service._id} service={service} onBook={onBook} onViewProfile={onViewProfile} />
      ))}
    </div>
  );
};

export default ServicesGrid;