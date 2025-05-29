import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { API_URL } from '../services/incidents';
import './IncidentMap.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const IncidentMap = () => {
    const [incidents, setIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [filters, setFilters] = useState({
        crimeType: 'all',
        impact: 'all',
        date: ''
    });

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        try {
            console.log('Fetching incidents from:', `${API_URL}/incidents`);
            const response = await axios.get(`${API_URL}/incidents`);
            console.log('Incidents response:', response.data);
            setIncidents(response.data.data);
        } catch (error) {
            console.error('Error fetching incidents:', error);
        }
    };

    const filteredIncidents = incidents.filter(incident => {
        if (filters.crimeType !== 'all' && incident.crimeType !== filters.crimeType) return false;
        if (filters.impact !== 'all' && incident.crimeImpact !== filters.impact) return false;
        if (filters.date && new Date(incident.date).toDateString() !== new Date(filters.date).toDateString()) return false;
        return true;
    });

    const getMarkerColor = (incident) => {
        if (incident.crimeImpact === 'ALTO') return '#ff4444';
        if (incident.crimeImpact === 'BAJO') return '#ffbb33';
        return '#9E9E9E';
    };

    const handleMarkerClick = (incident) => {
        setSelectedIncident(incident);
    };

    return (
        <div className="incident-map-container">
            <div className="filters-container">
                <div className="filter-group">
                    <label>Tipo de Delito:</label>
                    <select
                        value={filters.crimeType}
                        onChange={(e) => setFilters({ ...filters, crimeType: e.target.value })}
                    >
                        <option value="all">Todos</option>
                        <optgroup label="Delitos de Alto Impacto">
                            <option value="Homicidio">Homicidio</option>
                            <option value="Feminicidio">Feminicidio</option>
                            <option value="Secuestro">Secuestro</option>
                            <option value="Extorsión">Extorsión</option>
                            <option value="Robo con violencia">Robo con violencia</option>
                            <option value="Robo de vehículo con violencia">Robo de vehículo con violencia</option>
                            <option value="Robo a casa habitación con violencia">Robo a casa habitación con violencia</option>
                            <option value="Robo a negocio con violencia">Robo a negocio con violencia</option>
                            <option value="Violación">Violación</option>
                            <option value="Trata de personas">Trata de personas</option>
                        </optgroup>
                        <optgroup label="Delitos de Bajo Impacto">
                            <option value="Robo sin violencia">Robo sin violencia</option>
                            <option value="Robo de vehículo sin violencia">Robo de vehículo sin violencia</option>
                            <option value="Robo a casa habitación sin violencia">Robo a casa habitación sin violencia</option>
                            <option value="Robo a negocio sin violencia">Robo a negocio sin violencia</option>
                            <option value="Acoso en la vía pública">Acoso en la vía pública</option>
                            <option value="Fraude">Fraude</option>
                            <option value="Falsificación de documentos">Falsificación de documentos</option>
                            <option value="Lesiones menores">Lesiones menores</option>
                            <option value="Quejas por ruido">Quejas por ruido</option>
                            <option value="Vandalismo">Vandalismo</option>
                            <option value="Violencia familiar">Violencia familiar</option>
                            <option value="Amenazas">Amenazas</option>
                        </optgroup>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Impacto:</label>
                    <select
                        value={filters.impact}
                        onChange={(e) => setFilters({ ...filters, impact: e.target.value })}
                    >
                        <option value="all">Todos</option>
                        <option value="ALTO">Alto Impacto</option>
                        <option value="BAJO">Bajo Impacto</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Fecha:</label>
                    <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    />
                </div>
            </div>

            <div className="map-details-container">
                <div className="map-container">
                    <MapContainer
                        center={[19.4565, -99.1367]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {filteredIncidents.map((incident) => (
                            <Marker
                                key={incident._id}
                                position={[incident.location.coordinates.lat, incident.location.coordinates.lng]}
                                eventHandlers={{
                                    click: () => handleMarkerClick(incident),
                                }}
                                icon={L.divIcon({
                                    className: 'custom-marker',
                                    html: `<div style="background-color: ${getMarkerColor(incident)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                                    iconSize: [20, 20],
                                })}
                            >
                                <Popup>
                                    <div>
                                        <h6>{incident.crimeType}</h6>
                                        <p>{incident.location.street}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div className="incident-details">
                    {selectedIncident ? (
                        <div className="details-card">
                            <h4>Detalles del Incidente</h4>
                            <div className="detail-item">
                                <strong>Tipo:</strong> {selectedIncident.type}
                            </div>
                            <div className="detail-item">
                                <strong>Delito:</strong> {selectedIncident.crimeType}
                            </div>
                            <div className="detail-item">
                                <strong>Impacto:</strong> {selectedIncident.crimeImpact}
                            </div>
                            <div className="detail-item">
                                <strong>Fecha:</strong> {new Date(selectedIncident.date).toLocaleDateString()}
                            </div>
                            <div className="detail-item">
                                <strong>Hora:</strong> {selectedIncident.time}
                            </div>
                            <div className="detail-item">
                                <strong>Ubicación:</strong> {selectedIncident.location.street}
                            </div>
                            <div className="detail-item">
                                <strong>Descripción:</strong> {selectedIncident.description}
                            </div>
                            <div className="detail-item">
                                <strong>Reportado por:</strong> {selectedIncident.reportedBy}
                            </div>
                            {selectedIncident.additionalDetails?.notes && (
                                <div className="detail-item">
                                    <strong>Notas adicionales:</strong> {selectedIncident.additionalDetails.notes}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-selection">
                            <p>Selecciona un incidente en el mapa para ver sus detalles</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IncidentMap; 