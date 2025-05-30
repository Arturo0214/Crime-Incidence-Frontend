import axios from 'axios';

// Base axios configuration
const instance = axios.create({
    baseURL: 'https://crime-incidence-backend.onrender.com/api',
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
        if (error.code === 'ERR_NETWORK') {
            console.error('Connection error: Could not connect to server');
        } else if (error.response) {
            console.error('Server error:', error.response.status, error.response.data);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } else if (error.request) {
            console.error('No response received from server');
        } else {
            console.error('Request configuration error:', error.message);
        }
        return Promise.reject(error);
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