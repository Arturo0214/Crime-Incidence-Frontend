import axios from 'axios';

// Base axios configuration
const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://crime-incidence-backend.onrender.com/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: false
});

// Response interceptor for error handling
instance.interceptors.response.use(
    response => response,
    error => {
        // Check if the response is HTML instead of JSON
        if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
            console.error('Server returned HTML instead of JSON. This might indicate a server error or authentication issue.');
            return Promise.reject(new Error('Server returned invalid response format'));
        }

        if (error.code === 'ERR_NETWORK') {
            console.error('Connection error: Could not connect to server');
            return Promise.reject(new Error('No se pudo conectar al servidor'));
        } else if (error.response) {
            console.error('Server error:', error.response.status, error.response.data);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return Promise.reject(new Error('Sesión expirada'));
            }
            return Promise.reject(new Error(error.response.data?.message || 'Error del servidor'));
        } else if (error.request) {
            console.error('No response received from server');
            return Promise.reject(new Error('No se recibió respuesta del servidor'));
        } else {
            console.error('Request configuration error:', error.message);
            return Promise.reject(error);
        }
    }
);

// Request interceptor
instance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Add timestamp to prevent caching
        config.params = {
            ...config.params,
            _t: new Date().getTime()
        };
        return config;
    },
    error => {
        console.error('Request configuration error:', error);
        return Promise.reject(error);
    }
);

export default instance; 