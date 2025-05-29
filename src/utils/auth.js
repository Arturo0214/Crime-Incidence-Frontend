import { jwtDecode } from 'jwt-decode';

export const isAdmin = (user) => {
    if (user?.role) return user.role === 'admin';
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = jwtDecode(token);
            return payload.role === 'admin';
        } catch {
            return false;
        }
    }
    return false;
}; 