// services/api.js
import axios from 'axios';

// Use environment variable if available; otherwise fallback to local backend.
// Vite only exposes env vars prefixed with `VITE_`.
const envApiBase =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) ||
  '';

// Backend runs on 4000 in this project; ignore mistaken 5000 configs.
const API_BASE =
  envApiBase && !envApiBase.includes(':5000') ? envApiBase : 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor to attach token if needed
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchServices = (params) => api.get('/services', { params });
export const createService = (payload) => api.post('/services', payload);
export const updateService = (id, payload) => api.put(`/services/${id}`, payload);
export const deleteService = (id) => api.delete(`/services/${id}`);

export const fetchCategories = (params) => api.get('/categories', { params });
export const createCategory = (payload) => api.post('/categories', payload);
export const updateCategory = (id, payload) => api.put(`/categories/${id}`, payload);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

export const signupCustomer = (payload) => api.post('/auth/signup/customer', payload);

export const signupSupplier = (formData) =>
  api.post('/auth/signup/supplier', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const loginCustomer = (payload) => api.post('/auth/login/customer', payload);

export const fetchMe = () => api.get('/auth/me');

export const updateCustomerProfile = (payload) => api.put('/auth/profile/customer', payload);
export const updateSupplierProfile = (formData) =>
  api.put('/auth/profile/supplier', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const changePassword = (payload) => api.put('/auth/profile/password', payload);
export const deleteMyAccount = () => api.delete('/auth/profile/me');

export const login = (payload) => api.post('/auth/login', payload);
export const requestForgotPasswordOtp = (payload) => api.post('/auth/forgot-password/request-otp', payload);
export const resetPasswordWithOtp = (payload) => api.post('/auth/forgot-password/reset', payload);

export const fetchAdminSuppliers = () => api.get('/admin/suppliers');

export const approveAdminSupplier = (id) => api.put(`/admin/suppliers/${id}/approve`);

export const rejectAdminSupplier = (id) => api.put(`/admin/suppliers/${id}/reject`);

export const updateAdminSupplierGrading = (id, grading) =>
  api.put(`/admin/suppliers/${id}/grading`, { grading });

export const updateAdminSupplier = (id, payload) =>
  api.put(`/admin/suppliers/${id}`, payload);

export const sendAdminSupplierCredentials = (id) =>
  api.post(`/admin/suppliers/${id}/send-credentials`);
export const recoverAdminSupplier = (id) =>
  api.post(`/admin/suppliers/${id}/recover`);

export const createCatalogRequest = (payload) => api.post('/admin/catalog/requests', payload);
export const fetchCatalogRequests = (status) =>
  api.get('/admin/catalog/requests', { params: status ? { status } : {} });
export const fetchCatalogRequestCount = () => api.get('/admin/catalog/requests/count');
export const updateCatalogRequest = (id, payload) => api.put(`/admin/catalog/requests/${id}`, payload);
export const completeCatalogRequest = (id) => api.post(`/admin/catalog/requests/${id}/complete`);

export const fetchMarketResearch = () => api.get('/admin/market-research');
export const upsertMarketResearch = (payload) => api.post('/admin/market-research', payload);
export const deleteMarketResearch = (id) => api.delete(`/admin/market-research/${id}`);
export const fetchAdminComplaints = () => api.get('/admin/complaints');
export const updateAdminComplaintStatus = (bookingId, status) =>
  api.put(`/admin/complaints/${bookingId}/status`, { status });
export const notifyComplaintSupplier = (bookingId) =>
  api.post(`/admin/complaints/${bookingId}/notify-supplier`);
export const decideAdminComplaint = (bookingId, decision) =>
  api.post(`/admin/complaints/${bookingId}/decision`, { decision });
export const deleteAdminComplaint = (bookingId) =>
  api.delete(`/admin/complaints/${bookingId}`);

export const fetchRecentSuppliers = (limit = 4) =>
  api.get('/public/suppliers/recent', { params: { limit } });
export const fetchSupplierBookedTimes = (supplierId, date) =>
  api.get(`/public/suppliers/${supplierId}/booked-times`, { params: { date } });

export const fetchPublicCatalogOptions = () => api.get('/public/catalog/options');

/** Admin: categories + services including inactive (requires admin JWT). */
export const fetchAdminCatalogOptions = () => api.get('/admin/catalog/options');

/** Admin: all service master rows including inactive (requires admin JWT). */
export const fetchAdminServices = (params) => api.get('/admin/services', { params });
export const fetchAdminBookings = () => api.get('/admin/bookings');
export const fetchAdminReviews = () => api.get('/admin/reviews');
export const deleteAdminReview = (bookingId) => api.delete(`/admin/reviews/${bookingId}`);

export const fetchGradingConfig = () => api.get('/public/grading-config');
export const fetchDiscountBanner = () => api.get('/public/discount-banner');
export const previewDiscount = (payload) => api.post('/public/discounts/preview', payload);

export const saveGradingConfig = (payload) => api.put('/admin/grading-config', payload);
export const createDiscount = (payload) => api.post('/admin/discounts', payload);
export const fetchAdminDiscounts = () => api.get('/admin/discounts');

export const createBooking = (payload) => api.post('/bookings', payload);

export const fetchMyBookings = () => api.get('/bookings/me');
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);

export const updateBookingStatus = (id, status) => api.put(`/bookings/${id}/status`, { status });

// Customer: complete payment for an approved booking
export const payBooking = (id, payload) => api.post(`/bookings/${id}/pay`, payload);
export const createBookingReview = (id, payload) => api.post(`/bookings/${id}/review`, payload);
export const updateBookingReview = (id, payload) => api.put(`/bookings/${id}/review`, payload);
export const deleteBookingReview = (id) => api.delete(`/bookings/${id}/review`);
export const createBookingComplaint = (id, formData) =>
  api.post(`/bookings/${id}/complaint`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const updateBookingComplaint = (id, formData) =>
  api.put(`/bookings/${id}/complaint`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const deleteBookingComplaint = (id) => api.delete(`/bookings/${id}/complaint`);
export const respondBookingComplaint = (id, responseText) =>
  api.post(`/bookings/${id}/complaint/respond`, { responseText });