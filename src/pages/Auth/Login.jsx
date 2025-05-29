import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/user';
import './Login.css';

const Login = () => {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        try {
            const res = await login(form);
            localStorage.setItem('token', res.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-title">Iniciar sesión</h2>
            <form className="login-form" onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-control" name="username" value={form.username} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} required />
                </div>
                {error && <div className="login-alert alert alert-danger py-2">{error}</div>}
                <button className="login-btn" type="submit">Entrar</button>
            </form>
            <div className="mt-3 text-center">
                {/* <span>¿No tienes cuenta? </span>
                <Link to="/register">Regístrate</Link> */}
            </div>
        </div>
    );
};

export default Login; 