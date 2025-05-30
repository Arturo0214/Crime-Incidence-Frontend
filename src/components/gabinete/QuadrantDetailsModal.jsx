import React, { useEffect, useMemo } from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import './QuadrantDetailsModal.css';

const QuadrantDetailsModal = ({
    show,
    onHide,
    selectedQuadrant,
    filteredIncidents,
    modalFilters,
    setModalFilters,
    getQuadrantColor,
    setModalSelectedIncident,
    modalSelectedIncident,
    getStatusBadgeClass,
    INCIDENT_TYPES,
    mapRef
}) => {
    // Calcular el centroide del cuadrante usando turf
    const modalMapCenter = useMemo(() => {
        if (!selectedQuadrant) return [19.45, -99.14];
        try {
            const center = turf.centroid(selectedQuadrant);
            return [center.geometry.coordinates[1], center.geometry.coordinates[0]];
        } catch (error) {
            console.error('Error al calcular el centroide:', error);
            return [19.45, -99.14];
        }
    }, [selectedQuadrant]);

    // Calcular los límites del cuadrante
    const modalBounds = useMemo(() => {
        if (!selectedQuadrant) return null;
        try {
            const bbox = turf.bbox(selectedQuadrant);
            return [
                [bbox[1], bbox[0]], // [south, west]
                [bbox[3], bbox[2]]  // [north, east]
            ];
        } catch (error) {
            console.error('Error al calcular los límites:', error);
            return null;
        }
    }, [selectedQuadrant]);

    // Centrar el mapa cuando se abre el modal
    useEffect(() => {
        if (show && mapRef.current && modalBounds) {
            setTimeout(() => {
                mapRef.current.fitBounds(modalBounds, {
                    maxZoom: 16,
                    padding: [30, 30],
                    animate: true
                });
            }, 200);
        }
    }, [show, modalBounds, mapRef]);

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

    if (!selectedQuadrant || !selectedQuadrant.properties) {
        return null;
    }

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg"
            className="quadrant-details-modal">
            <Modal.Header closeButton className="border-bottom-0">
                <Modal.Title className="w-100">
                    <h4 className="mb-0">Detalles del Cuadrante {selectedQuadrant.properties.no_cdrn}</h4>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Filtros del modal */}
                <div className="modal-filters qd-filtros" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    {/* Primera fila: búsqueda y limpiar */}
                    <Row className="mb-3 px-2 align-items-center">
                        <Col xs={12} md={10}>
                            <input
                                type="text"
                                className="qd-filtro-buscar w-100"
                                placeholder="Buscar por tipo, descripción, ubicación o reportado por..."
                                value={modalFilters.search}
                                onChange={e => setModalFilters(f => ({ ...f, search: e.target.value }))}
                            />
                        </Col>
                        <Col xs={12} md={2}>
                            <button
                                type="button"
                                className="qd-filtro-limpiar w-100"
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
                        </Col>
                    </Row>
                    {/* Segunda fila: filtros con diseño unificado */}
                    <Row className="g-2 mb-3 px-2">
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Desde</label>
                            <input
                                type="date"
                                className="form-control shadow-sm filtro-unificado filtro-date-black"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                value={modalFilters.from}
                                onChange={e => setModalFilters(f => ({ ...f, from: e.target.value }))}
                                placeholder="Desde"
                            />
                        </Col>
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Hasta</label>
                            <input
                                type="date"
                                className="form-control shadow-sm filtro-unificado filtro-date-black"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                value={modalFilters.to}
                                onChange={e => setModalFilters(f => ({ ...f, to: e.target.value }))}
                                placeholder="Hasta"
                            />
                        </Col>
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Impacto</label>
                            <select
                                className="form-select shadow-sm filtro-unificado"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                value={modalFilters.impact}
                                onChange={e => setModalFilters(f => ({ ...f, impact: e.target.value }))}
                            >
                                <option value="all">Todos</option>
                                <option value="ALTO">Alto</option>
                                <option value="BAJO">Bajo</option>
                            </select>
                        </Col>
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Tipo</label>
                            <select
                                className="form-select shadow-sm filtro-unificado"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                value={modalFilters.incidentType}
                                onChange={e => setModalFilters(f => ({ ...f, incidentType: e.target.value }))}
                            >
                                <option value="all">Tipo</option>
                                {INCIDENT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </Col>
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Estado</label>
                            <select
                                className="form-select shadow-sm filtro-unificado"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                value={modalFilters.status}
                                onChange={e => setModalFilters(f => ({ ...f, status: e.target.value }))}
                            >
                                <option value="all">Estado</option>
                                <option value="reportado">Reportado</option>
                                <option value="en investigación">En Investigación</option>
                                <option value="resuelto">Resuelto</option>
                                <option value="archivado">Archivado</option>
                            </select>
                        </Col>
                        <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
                            <label className="form-label mb-1" style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>Reportado por...</label>
                            <input
                                type="text"
                                className="form-control shadow-sm filtro-unificado"
                                style={{ height: 44, borderRadius: 12, border: '1.5px solid #b3d1f7', background: '#f8fafc', fontSize: '1rem', boxShadow: '0 1px 6px rgba(44,62,80,0.06)' }}
                                placeholder="Dependencia..."
                                value={modalFilters.reportedBy}
                                onChange={e => setModalFilters(f => ({ ...f, reportedBy: e.target.value }))}
                            />
                        </Col>
                    </Row>
                </div>
                {/* Fin filtros modal */}
                <div
                    className="modal-map-container px-3"
                    style={{
                        height: '260px',
                        minHeight: 180,
                        margin: '18px 0',
                        position: 'relative',
                        zIndex: 1,
                        marginBottom: 32,
                    }}
                >
                    <MapContainer
                        ref={mapRef}
                        center={modalMapCenter}
                        zoom={15}
                        minZoom={14}
                        maxZoom={17}
                        style={{
                            height: '100%',
                            width: '100%',
                            borderRadius: 10,
                            position: 'relative',
                            zIndex: 1,
                            minHeight: 180,
                        }}
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
                                    <div style={{
                                        minWidth: 140,
                                        maxWidth: 180,
                                        padding: '0.5rem 0.5rem 0.2rem 0.5rem',
                                        borderRadius: 8,
                                        background: '#fff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                                        zIndex: 1001
                                    }}>
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
                {modalSelectedIncident && (
                    <div className="details-card">
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <span style={{ fontSize: 28, color: '#2563eb' }}>
                                <div style={{ background: modalSelectedIncident.crimeImpact === 'ALTO' ? '#ff4444' : '#ffbb33', width: 24, height: 24, borderRadius: '50%', border: '2px solid white' }}></div>
                            </span>
                            <div>
                                <h5 className="mb-1">{modalSelectedIncident.type || 'Incidente'}</h5>
                                {modalSelectedIncident.crimeType && <p className="text-muted mb-0">{modalSelectedIncident.crimeType}</p>}
                            </div>
                        </div>
                        <div className="mb-2">
                            <strong>Ubicación:</strong> {modalSelectedIncident.location.street}
                        </div>
                        {modalSelectedIncident.date && (
                            <div className="mb-2">
                                <strong>Fecha:</strong> {new Date(modalSelectedIncident.date).toLocaleDateString()}
                                {modalSelectedIncident.time && (
                                    <span className="ms-2">
                                        <strong>Hora:</strong> {modalSelectedIncident.time}
                                    </span>
                                )}
                            </div>
                        )}
                        {modalSelectedIncident.description && (
                            <div className="mb-2">
                                <strong>Descripción:</strong> {modalSelectedIncident.description}
                            </div>
                        )}
                        <div className="d-flex flex-wrap gap-3">
                            {modalSelectedIncident.reportedBy && (
                                <div>
                                    <strong>Reportado por:</strong> {modalSelectedIncident.reportedBy}
                                </div>
                            )}
                            {modalSelectedIncident.status && (
                                <div>
                                    <strong>Estado:</strong> {modalSelectedIncident.status}
                                </div>
                            )}
                        </div>
                        <div className="d-flex justify-content-end mt-3">
                            <Button
                                variant="secondary"
                                onClick={() => setModalSelectedIncident(null)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
                {/* Lista de incidentes */}
                <div className="px-3 py-4">
                    {filterModalIncidents(filteredIncidents).length > 0 ? (
                        <Row className="g-4">
                            {filterModalIncidents(filteredIncidents).map(incident => (
                                <Col xs={12} key={incident._id}>
                                    <Card className="shadow-sm">
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h5 className="mb-1">{incident.type}</h5>
                                                    <p className="text-muted mb-1">{incident.location.street}</p>
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
                                            {incident.description && (
                                                <p className="mb-3">{incident.description}</p>
                                            )}
                                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                                                <div className="d-flex flex-wrap gap-4">
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
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => setModalSelectedIncident(incident)}
                                                >
                                                    Más información
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <div className="text-center py-5">
                            <p className="text-muted mb-0">No hay incidentes registrados en este cuadrante.</p>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default QuadrantDetailsModal; 