import React from 'react';

function Footer() {
    return (
        <footer className="footer mt-auto py-3 bg-dark text-white">
            <div className="container">
                <div className="row">
                    <div className="col-md-4">
                        <h5>Mapa de Incidencias Tlatelolco</h5>
                        <p className="small">
                            Una plataforma para monitorear y reportar incidentes en la zona de Tlatelolco,
                            ayudando a mantener informada a la comunidad.
                        </p>
                    </div>
                    <div className="col-md-4">
                        <h5>Enlaces Útiles</h5>
                        <ul className="list-unstyled">
                            <li><a href="https://www.cuauhtemoc.cdmx.gob.mx/" className="text-white">Alcaldía Cuauhtémoc</a></li>
                            <li><a href="https://www.ssc.cdmx.gob.mx/" className="text-white">Secretaría de Seguridad Ciudadana</a></li>
                            <li><a href="https://www.emergencias.cdmx.gob.mx/" className="text-white">Centro de Emergencias CDMX</a></li>
                        </ul>
                    </div>
                    <div className="col-md-4">
                        <h5>Contacto de Emergencia</h5>
                        <p className="small">
                            En caso de emergencia, contacta inmediatamente a los servicios de emergencia:
                            <br />
                            <strong>Policía:</strong> 911
                            <br />
                            <strong>Bomberos:</strong> 911
                            <br />
                            <strong>Protección Civil:</strong> 911
                        </p>
                    </div>
                </div>
                <hr className="my-4" />
                <div className="row">
                    <div className="col-12 text-center">
                        <p className="small mb-0">
                            © {new Date().getFullYear()} Mapa de Incidencias Tlatelolco. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer; 