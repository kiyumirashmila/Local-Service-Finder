import React, { createContext, useEffect, useState } from 'react';
import {
  fetchMe,
  login as loginApi,
  signupCustomer,
  signupSupplier,
  updateCustomerProfile,
  updateSupplierProfile,
  deleteMyAccount,
  changePassword
} from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const normalizeAuthUser = (raw, fallbackEmail) => {
    if (!raw || typeof raw !== 'object') return null;
    return {
      ...raw,
      email: raw.email || fallbackEmail || '',
      name: raw.name || raw.fullName || '',
      fullName: raw.fullName || raw.name || '',
      avatar: raw.avatar || raw.avatarUrl || '',
      avatarUrl: raw.avatarUrl || raw.avatar || ''
    };
  };

  const loadMe = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetchMe();
      setUser(res.data.user);
      setIsAuthenticated(true);
    } catch (e) {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    // Restore user from token on refresh.
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mockLogin = (email, password) => {
    // mock login – replace with API call
    setUser({
      name: 'John',
      email,
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    });
    setIsAuthenticated(true);
  };

  const signup = (name, email, password) => {
    // mock signup – replace with API call
    setUser({
      name,
      email,
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    });
    setIsAuthenticated(true);
  };

  const signupCustomerReal = async (payload) => {
    const res = await signupCustomer(payload);
    if (res.data.token) localStorage.setItem('token', res.data.token);
    
    let resolvedUser;
    try {
      const me = await fetchMe();
      resolvedUser = normalizeAuthUser(me.data.user, payload?.email);
    } catch {
      resolvedUser = normalizeAuthUser(res.data.user, payload?.email);
    }
    
    setUser(resolvedUser);
    setIsAuthenticated(true);
    return resolvedUser;
  };

  const signupSupplierReal = async (formData) => {
    const res = await signupSupplier(formData);
    // Supplier signup is an application flow; backend may not return token/user.
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      let emailExtraction = null;
      try { emailExtraction = formData.get('email'); } catch(e) {}
      
      let resolvedUser;
      try {
        const me = await fetchMe();
        resolvedUser = normalizeAuthUser(me.data.user, emailExtraction);
      } catch {
        resolvedUser = normalizeAuthUser(res.data.user, emailExtraction);
      }
      
      setUser(resolvedUser);
      setIsAuthenticated(true);
      return resolvedUser;
    }
    return res.data;
  };

  const loginReal = async (payload) => {
    const res = await loginApi(payload);
    if (res.data.token) localStorage.setItem('token', res.data.token);

    let resolvedUser;
    try {
      const me = await fetchMe();
      resolvedUser = normalizeAuthUser(me.data.user, payload?.email);
    } catch (e) {
      resolvedUser =
        normalizeAuthUser(res.data.user, payload?.email) ||
        normalizeAuthUser(res.data.customer, payload?.email) ||
        normalizeAuthUser(res.data.supplier, payload?.email) ||
        normalizeAuthUser(res.data.admin, payload?.email);
    }

    setUser(resolvedUser);
    setIsAuthenticated(true);
    return resolvedUser || null;
  };

  const updateCustomerProfileReal = async (payload) => {
    const res = await updateCustomerProfile(payload);
    setUser(res.data.user);
    return res.data.user;
  };

  const updateSupplierProfileReal = async (formData) => {
    const res = await updateSupplierProfile(formData);
    setUser(res.data.user);
    return res.data.user;
  };

  const changePasswordReal = async (payload) => {
    const res = await changePassword(payload);
    return res.data;
  };

  const deleteAccountReal = async () => {
    const res = await deleteMyAccount();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    window.location.hash = 'home';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login: mockLogin,
        signup, // mocked legacy method
        signupCustomerReal,
        signupSupplierReal,
        loginReal,
        updateCustomerProfileReal,
        updateSupplierProfileReal,
        changePasswordReal,
        deleteAccountReal,
        reloadMe: loadMe,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};