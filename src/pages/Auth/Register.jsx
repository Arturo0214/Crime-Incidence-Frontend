import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/user';

const Register = () => {
    const [form, setForm] = useState({ username: '', password: '', role: 'user' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await register(form);
            setSuccess('Usuario registrado correctamente. Ahora puedes iniciar sesión.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar');
        }
    };

    return (
        <div className="container py-5" style={{ maxWidth: 400 }}>
            <h2 className="mb-4">Registro</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-control" name="username" value={form.username} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} required />
                </div>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                {success && <div className="alert alert-success py-2">{success}</div>}
                <button className="btn btn-primary w-100" type="submit">Registrarse</button>
            </form>
            <div className="mt-3 text-center">
                <span>¿Ya tienes cuenta? </span>
                <Link to="/login">Inicia sesión</Link>
            </div>
        </div>
    );
};

export default Register; 