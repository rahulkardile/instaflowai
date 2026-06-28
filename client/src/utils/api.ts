import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("instaflow-user");
  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    } catch {
      // ignore malformed data
    }
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("instaflow-user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
