import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ activeSection, setActiveSection }) {
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/" onClick={() => setActiveSection('map')}>
                    Mapa de Incidencias Tlatelolco
                </Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto align-items-center">
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                                to="/"
                                onClick={() => setActiveSection('map')}
                            >
                                Mapa
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${location.pathname.startsWith('/gabinete') ? 'active' : ''}`}
                                to="/gabinete"
                                onClick={() => setActiveSection('gabinete')}
                            >
                                Gabinete
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${activeSection === 'statistics' ? 'active' : ''}`}
                                to="/statistics"
                                onClick={() => setActiveSection('statistics')}
                            >
                                Estadísticas
                            </Link>
                        </li>
                        {!token ? (
                            <li className="nav-item">
                                <Link className="nav-link" to="/login">Iniciar sesión</Link>
                            </li>
                        ) : (
                            <li className="nav-item">
                                <button className="btn btn-outline-light ms-2" onClick={handleLogout}>Cerrar sesión</button>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar; 