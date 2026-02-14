import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ activeSection, setActiveSection }) {
    const location = useLocation();
    const navbarCollapse = useRef(null);

    const handleNavClick = (section) => {
        setActiveSection(section);
        // Cerrar el menú hamburguesa usando el atributo data-bs-toggle
        const navbarToggler = document.querySelector('.navbar-toggler');
        if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
            navbarToggler.click();
        }
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/" onClick={() => handleNavClick('map')}>
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
                <div className="collapse navbar-collapse" id="navbarNav" ref={navbarCollapse}>
                    <ul className="navbar-nav ms-auto align-items-center">
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                                to="/"
                                onClick={() => handleNavClick('map')}
                            >
                                Mapa
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${location.pathname.startsWith('/gabinete') ? 'active' : ''}`}
                                to="/gabinete"
                                onClick={() => handleNavClick('gabinete')}
                            >
                                Gabinete
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link ${activeSection === 'statistics' ? 'active' : ''}`}
                                to="/statistics"
                                onClick={() => handleNavClick('statistics')}
                            >
                                Estadísticas
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar; 