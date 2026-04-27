import { useState, useEffect, useCallback } from 'react';
import { fetchServices } from '../services/api';

export const useServices = (initialFilters) => {
  const [filters, setFilters] = useState(initialFilters);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.location) params.location = filters.location;
      // optionally add sorting if your backend supports it
      const response = await fetchServices(params);
      setServices(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return { services, loading, error, filters, updateFilter, resetFilters };
};