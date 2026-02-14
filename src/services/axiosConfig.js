import axios from 'axios';

// Base axios configuration
const instance = axios.create({
    baseURL: 'https://crime-incidence-backend-production.up.railway.app/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: false,
    // Aumentar el timeout para dar más tiempo a las respuestas
    timeout: 30000,
    // Asegurarse de que las credenciales se envíen correctamente
    validateStatus: function (status) {
        return status >= 200 && status < 500; // Manejar errores 500 en el interceptor
    }
});

// Response interceptor for error handling
instance.interceptors.response.use(
    response => {
        // Si la respuesta es exitosa pero contiene HTML cuando esperamos JSON
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            console.error('Received HTML response when expecting JSON:', {
                url: response.config.url,
                status: response.status,
                contentType
            });

            // Si es una respuesta de login o registro, permitirla
            if (response.config.url.includes('login') || response.config.url.includes('register')) {
                return response;
            }

            // Para otras rutas, considerar como error de autenticación
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return Promise.reject(new Error('Invalid response type: expected JSON, got HTML'));
        }
        return response;
    },
    error => {
        console.error('Axios error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers,
            message: error.message
        });

        // Si el error contiene HTML
        if (error.response?.headers['content-type']?.includes('text/html')) {
            console.error('Received HTML error response');
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return Promise.reject(new Error('Session expired or invalid response'));
        }

        // Error de red
        if (error.code === 'ERR_NETWORK') {
            return Promise.reject(new Error('No se pudo conectar al servidor. Por favor, verifica tu conexión.'));
        }

        // Error con respuesta del servidor
        if (error.response) {
            // Error de autenticación
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(new Error('Sesión expirada o inválida'));
            }

            // Error del servidor
            if (error.response.status >= 500) {
                return Promise.reject(new Error('Error del servidor. Por favor, intenta más tarde.'));
            }

            return Promise.reject(error.response.data || new Error('Error en la solicitud'));
        }

        // Error sin respuesta
        if (error.request) {
            return Promise.reject(new Error('No se recibió respuesta del servidor'));
        }

        // Otros errores
        return Promise.reject(error);
    }
);

// Request interceptor
instance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');

        // Agregar token si existe
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Verificar autenticación para rutas protegidas
        if (!token && !config.url.includes('login') && !config.url.includes('register')) {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return Promise.reject(new Error('No authentication token'));
        }

        // Prevenir caché
        const timestamp = new Date().getTime();
        const separator = config.url.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}_t=${timestamp}`;

        return config;
    },
    error => {
        console.error('Request configuration error:', error);
        return Promise.reject(error);
    }
);

export default instance; 