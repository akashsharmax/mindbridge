/**
 * utils/api.js — Axios Instance
 *
 * Pre-configured axios with base URL and credentials.
 * withCredentials: true ensures cookies are sent with every request.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect from login/register pages
      if (!window.location.pathname.includes("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
