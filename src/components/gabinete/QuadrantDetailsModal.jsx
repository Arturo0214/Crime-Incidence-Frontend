import React, { useEffect, useMemo } from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import MiniIncidentMap from './MiniIncidentMap';
import L from 'leaflet';
import * as turf from '@turf/turf';
import './QuadrantDetailsModal.css';

const QuadrantDetailsModal = ({
    show,
    onHide,
    selectedQuadrant,
    cuadrantesData,
    filteredIncidents,
    modalFilters,
    setModalFilters,
    getQuadrantColor,
    setModalSelectedIncident,
    modalSelectedIncident,
    handleEditIncident,
    getStatusBadgeClass,
    INCIDENT_TYPES,
    mapRef
}) => {
    const modalMapCenter = useMemo(() => {
        if (!selectedQuadrant?.latitude || !selectedQuadrant?.longitude) return [19.45, -99.14];
        return [selectedQuadrant.latitude, selectedQuadrant.longitude];
    }, [selectedQuadrant]);

    useEffect(() => {
        if (show && mapRef.current && selectedQuadrant?.geometry?.coordinates) {
            setTimeout(() => {
                mapRef.current.fitBounds(selectedQuadrant.geometry.coordinates, { maxZoom: 16, padding: [30, 30] });
                setTimeout(() => {
                    mapRef.current.setView(modalMapCenter, mapRef.current.getZoom());
                }, 150);
            }, 200);
        }
    }, [show, selectedQuadrant, modalMapCenter, mapRef]);

    // Lógica de filtrado local para el modal
    const filterModalIncidents = (incidents) => {
        if (!incidents) return [];
        return incidents.filter(incident => {
            if (modalFilters.impact !== 'all' && incident.crimeImpact !== modalFilters.impact) return false;
            if (modalFilters.date) {
                const incidentDate = new Date(incident.date);
                const selectedDate = new Date(modalFilters.date);
                if (
                    incidentDate.getFullYear() !== selectedDate.getFullYear() ||
                    incidentDate.getMonth() !== selectedDate.getMonth() ||
                    incidentDate.getDate() !== selectedDate.getDate()
                ) {
                    return false;
                }
            }
            // Rango de fechas
            if (modalFilters.from || modalFilters.to) {
                const incidentDate = new Date(incident.date);
                if (modalFilters.from) {
                    const fromDate = new Date(modalFilters.from);
                    fromDate.setHours(0, 0, 0, 0);
                    if (incidentDate < fromDate) return false;
                }
                if (modalFilters.to) {
                    const toDate = new Date(modalFilters.to);
                    toDate.setHours(23, 59, 59, 999);
                    if (incidentDate > toDate) return false;
                }
            }
            if (modalFilters.reportedBy && incident.reportedBy) {
                if (!incident.reportedBy.toLowerCase().includes(modalFilters.reportedBy.toLowerCase())) {
                    return false;
                }
            }
            if (modalFilters.incidentType !== 'all' && incident.type !== modalFilters.incidentType) {
                return false;
            }
            if (modalFilters.status !== 'all' && incident.status !== modalFilters.status) {
                return false;
            }
            if (modalFilters.search.trim() !== '') {
                const search = modalFilters.search.trim().toLowerCase();
                if (!(
                    (incident.crimeType && incident.crimeType.toLowerCase().includes(search)) ||
                    (incident.description && incident.description.toLowerCase().includes(search)) ||
                    (incident.location && incident.location.street && incident.location.street.toLowerCase().includes(search)) ||
                    (incident.reportedBy && incident.reportedBy.toLowerCase().includes(search))
                )) {
                    return false;
                }
            }
            return true;
        });
    };

    if (!selectedQuadrant) {
        return null;
    }

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg"
            className="quadrant-details-modal"
        >
            <Modal.Header closeButton className="border-bottom-0">
                <Modal.Title className="w-100">
                    <h4 className="mb-0">Detalles del Cuadrante {selectedQuadrant?.properties?.no_cdrn || 'N/A'}</h4>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Filtros del modal */}
                <div className="modal-filters qd-filtros" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    {/* Primera fila: búsqueda a la izquierda, limpiar pequeño a la derecha */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        marginBottom: 18,
                        gap: 12,
                        padding: '0 10px'
                    }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <input
                                type="text"
                                className="qd-filtro-buscar"
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: '1.13rem',
                                    borderRadius: 12,
                                    border: '1.5px solid #b3d1f7',
                                    padding: '0.85rem 1.2rem 0.85rem 2.5rem',
                                    background: '#f8fafc url("data:image/svg+xml;utf8,<svg fill=\'%2399a\' height=\'18\' viewBox=\'0 0 24 24\' width=\'18\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99c.41.41 1.09.41 1.5 0s.41-1.09 0-1.5l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg>") no-repeat 16px center',
                                    color: '#222',
                                    boxShadow: '0 2px 8px rgba(44, 62, 80, 0.08)',
                                    borderColor: '#b3d1f7',
                                    marginBottom: 0,
                                    fontWeight: 400
                                }}
                                placeholder="Buscar por tipo, descripción, ubicación o reportado por..."
                                value={modalFilters.search}
                                onChange={e => setModalFilters(f => ({ ...f, search: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <label style={{ fontSize: 13, color: '#fff', marginBottom: 4, userSelect: 'none' }}>&nbsp;</label>
                            <button
                                type="button"
                                className="qd-filtro-item qd-filtro-limpiar"
                                style={{
                                    flex: 'none',
                                    width: 80,
                                    height: 38,
                                    fontSize: '0.98rem',
                                    borderRadius: 10,
                                    background: '#f4f6fa',
                                    color: '#2563eb',
                                    border: '1.5px solid #b3d1f7',
                                    fontWeight: 500,
                                    boxShadow: '0 1px 6px rgba(44, 62, 80, 0.06)',
                                    transition: 'background 0.2s, color 0.2s',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setModalFilters({
                                    search: '',
                                    date: '',
                                    from: '',
                                    to: '',
                                    impact: 'all',
                                    incidentType: 'all',
                                    status: 'all',
                                    reportedBy: ''
                                })}
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                    {/* Segunda fila: todos los filtros con labels */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 10,
                        width: '100%',
                        padding: '0 10px'
                    }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Desde</label>
                            <input
                                type="date"
                                className="qd-filtro-item qd-filtro-fecha"
                                style={{ flex: 1, minWidth: 0, color: '#000', width: '100%' }}
                                value={modalFilters.from}
                                onChange={e => setModalFilters(f => ({ ...f, from: e.target.value }))}
                                placeholder="Desde"
                            />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Hasta</label>
                            <input
                                type="date"
                                className="qd-filtro-item qd-filtro-fecha-hasta"
                                style={{ flex: 1, minWidth: 0, color: '#000', width: '100%' }}
                                value={modalFilters.to}
                                onChange={e => setModalFilters(f => ({ ...f, to: e.target.value }))}
                                placeholder="Hasta"
                            />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Impacto</label>
                            <select
                                className="qd-filtro-item qd-filtro-impacto"
                                style={{ flex: 1, minWidth: 0 }}
                                value={modalFilters.impact}
                                onChange={e => setModalFilters(f => ({ ...f, impact: e.target.value }))}
                            >
                                <option value="all">Todos</option>
                                <option value="ALTO">Alto</option>
                                <option value="BAJO">Bajo</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Tipo</label>
                            <select
                                className="qd-filtro-item qd-filtro-tipo"
                                style={{ flex: 1, minWidth: 0 }}
                                value={modalFilters.incidentType}
                                onChange={e => setModalFilters(f => ({ ...f, incidentType: e.target.value }))}
                            >
                                <option value="all">Tipo</option>
                                {INCIDENT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Estado</label>
                            <select
                                className="qd-filtro-item qd-filtro-estado"
                                style={{ flex: 1, minWidth: 0 }}
                                value={modalFilters.status}
                                onChange={e => setModalFilters(f => ({ ...f, status: e.target.value }))}
                            >
                                <option value="all">Estado</option>
                                <option value="reportado">Reportado</option>
                                <option value="en investigación">En Investigación</option>
                                <option value="resuelto">Resuelto</option>
                                <option value="archivado">Archivado</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <label style={{ fontSize: 13, color: '#111', marginBottom: 4, marginLeft: 2, fontWeight: 500 }}>Reportado por...</label>
                            <input
                                type="text"
                                className="qd-filtro-item qd-filtro-reportado"
                                style={{ flex: 1, minWidth: 0, maxWidth: 180, fontSize: '12px', width: '100%' }}
                                placeholder="Dependencia..."
                                value={modalFilters.reportedBy}
                                onChange={e => setModalFilters(f => ({ ...f, reportedBy: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
                {/* Fin filtros modal */}
                <div className="modal-map-container" style={{ height: '260px', margin: '18px 0 18px 0', padding: '0 18px' }}>
                    <MapContainer
                        ref={mapRef}
                        center={modalMapCenter}
                        zoom={15}
                        minZoom={14}
                        maxZoom={17}
                        style={{ height: '100%', width: '100%', borderRadius: 10 }}
                        scrollWheelZoom={true}
                        zoomControl={true}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {selectedQuadrant && (
                            <GeoJSON
                                data={selectedQuadrant}
                                style={{
                                    color: '#2E7D32',
                                    weight: 3,
                                    fillColor: getQuadrantColor(selectedQuadrant.properties.no_cdrn),
                                    fillOpacity: 0.35
                                }}
                            />
                        )}
                        {filterModalIncidents(filteredIncidents).map((incident) => (
                            <Marker
                                key={incident._id}
                                position={[
                                    incident.location.coordinates.lat,
                                    incident.location.coordinates.lng
                                ]}
                                icon={L.divIcon({
                                    className: 'custom-marker',
                                    html: `<div style="background-color: ${incident.crimeImpact === 'ALTO' ? '#ff4444' : '#ffbb33'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12],
                                })}
                                eventHandlers={{
                                    click: () => setModalSelectedIncident(incident)
                                }}
                            >
                                <Popup>
                                    <div style={{ minWidth: 140, maxWidth: 180, padding: '0.5rem 0.5rem 0.2rem 0.5rem', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 22, color: '#2563eb' }}>
                                                <div style={{ background: incident.crimeImpact === 'ALTO' ? '#ff4444' : '#ffbb33', width: 20, height: 20, borderRadius: '50%', border: '2px solid white' }}></div>
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: 14, color: '#222' }}>{incident.type || 'Incidente'}</div>
                                                {incident.crimeType && <div style={{ fontSize: 14, color: '#555' }}>{incident.crimeType}</div>}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 14, color: '#444', marginBottom: 4 }}>
                                            <strong>Ubicación:</strong> {incident.location.street}
                                        </div>
                                        {incident.date && (
                                            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                                                <strong>Fecha:</strong> {new Date(incident.date).toLocaleDateString()}
                                                {incident.time && (
                                                    <span style={{ marginLeft: 8 }}>
                                                        <strong>Hora:</strong> {incident.time}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            style={{ marginTop: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 14, boxShadow: '0 1px 4px rgba(37,99,235,0.08)' }}
                                            onClick={() => setModalSelectedIncident(incident)}
                                        >
                                            Más información
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
                {/* Detalle del incidente seleccionado debajo del mapa */}
                {modalSelectedIncident && (
                    <div className="details-card" style={{ margin: '24px auto 0 auto', maxWidth: 500, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(44,62,80,0.08)', padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <span style={{ fontSize: 28, color: '#2563eb' }}>
                                <div style={{ background: modalSelectedIncident.crimeImpact === 'ALTO' ? '#ff4444' : '#ffbb33', width: 24, height: 24, borderRadius: '50%', border: '2px solid white' }}></div>
                            </span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 18, color: '#222' }}>{modalSelectedIncident.type || 'Incidente'}</div>
                                {modalSelectedIncident.crimeType && <div style={{ fontSize: 15, color: '#555' }}>{modalSelectedIncident.crimeType}</div>}
                            </div>
                        </div>
                        <div style={{ fontSize: 15, color: '#444', marginBottom: 6 }}>
                            <strong>Ubicación:</strong> {modalSelectedIncident.location.street}
                        </div>
                        {modalSelectedIncident.date && (
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 6 }}>
                                <strong>Fecha:</strong> {new Date(modalSelectedIncident.date).toLocaleDateString()}
                                {modalSelectedIncident.time && (
                                    <span style={{ marginLeft: 8 }}>
                                        <strong>Hora:</strong> {modalSelectedIncident.time}
                                    </span>
                                )}
                            </div>
                        )}
                        {modalSelectedIncident.description && (
                            <div style={{ fontSize: 14, color: '#444', marginBottom: 6 }}>
                                <strong>Descripción:</strong> {modalSelectedIncident.description}
                            </div>
                        )}
                        {modalSelectedIncident.reportedBy && (
                            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
                                <strong>Reportado por:</strong> {modalSelectedIncident.reportedBy}
                            </div>
                        )}
                        {modalSelectedIncident.status && (
                            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
                                <strong>Estado:</strong> {modalSelectedIncident.status}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button
                                className="popup-button"
                                style={{ background: '#adb5bd', color: '#222', border: 'none', borderRadius: 5, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                                onClick={() => setModalSelectedIncident(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
                {/* Lista de incidentes filtrados debajo del detalle individual */}
                {filterModalIncidents(filteredIncidents).length > 0 ? (
                    <div className="incidents-list incidents-list-full p-4">
                        {filterModalIncidents(filteredIncidents).map(incident => (
                            <div key={incident._id} className="incident-card mb-4">
                                <div className="incident-header d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h5 className="mb-1">{incident.type}</h5>
                                        <p className="mb-1 text-muted">{incident.location.street}</p>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <span className={`badge ${incident.crimeImpact === 'ALTO' ? 'bg-danger' : 'bg-warning'} me-2`}>
                                            {incident.crimeImpact}
                                        </span>
                                        <span className="text-muted">
                                            {new Date(incident.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="incident-body">
                                    {incident.description && (
                                        <p className="mb-3">{incident.description}</p>
                                    )}
                                    <div className="incident-details d-flex justify-content-between align-items-center">
                                        <div className="d-flex gap-4">
                                            <div>
                                                <small className="text-muted d-block">Reportado por</small>
                                                <span>{incident.reportedBy}</span>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block">Estado</small>
                                                <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
                                                    {incident.status || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="incident-actions">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleEditIncident(incident)}
                                            >
                                                Editar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <p className="text-muted mb-0">No hay incidentes registrados en este cuadrante.</p>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default QuadrantDetailsModal; 