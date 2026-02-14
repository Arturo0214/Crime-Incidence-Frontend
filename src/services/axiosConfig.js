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
            return Promise.reject(new Error('Invalid response from server'));
        }

        // Error de red
        if (error.code === 'ERR_NETWORK') {
            return Promise.reject(new Error('No se pudo conectar al servidor. Por favor, verifica tu conexión.'));
        }

        // Error con respuesta del servidor
        if (error.response) {
            // Error de autenticación
            if (error.response.status === 401) {
                console.warn('Received 401 response');
                return Promise.reject(new Error('No autorizado'));
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