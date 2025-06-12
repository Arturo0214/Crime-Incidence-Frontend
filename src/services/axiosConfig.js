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
    response => {
        // Verificar si la respuesta es HTML cuando esperábamos JSON
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html') && !response.config.url.includes('login')) {
            console.error('Received HTML response when expecting JSON');
            // Si recibimos HTML y no es la página de login, probablemente el token expiró
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(new Error('Session expired'));
        }
        return response;
    },
    error => {
        console.error('Axios error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
        });

        // Si recibimos HTML en un error, es probable que sea un problema de autenticación
        if (error.response?.headers['content-type']?.includes('text/html')) {
            console.error('Received HTML error response');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(new Error('Session expired'));
        }

        if (error.code === 'ERR_NETWORK') {
            console.error('Connection error: Could not connect to server');
            return Promise.reject(new Error('No se pudo conectar al servidor. Por favor, verifica tu conexión.'));
        } else if (error.response) {
            if (error.response.status === 401) {
                console.log('Unauthorized, redirecting to login...');
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            return Promise.reject(error.response.data || new Error('Error del servidor'));
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
            console.log('Request with token:', config.url);
        } else {
            console.log('Request without token:', config.url);
            // Si no hay token y no es una ruta pública, redirigir al login
            if (!config.url.includes('login') && !config.url.includes('register')) {
                window.location.href = '/login';
                return Promise.reject(new Error('No authentication token'));
            }
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