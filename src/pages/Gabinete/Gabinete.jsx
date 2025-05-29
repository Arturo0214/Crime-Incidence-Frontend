import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Button, Form, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isAdmin } from '../../utils/auth';
import { getIncidents } from '../../services/incidents';
import { createAttendance, getAttendance } from '../../services/attendance';
import './Gabinete.css';
import * as turf from '@turf/turf';
import SpecialInstructions from '../../components/gabinete/SpecialInstructions';
import CitizenRequests from '../../components/gabinete/CitizenRequests';
import 'leaflet/dist/leaflet.css';
import MiniIncidentMap from '../../components/gabinete/MiniIncidentMap';
import { INCIDENT_TYPES, getWeekNumber, getStatusBadgeClass } from '../../constants';
import QuadrantStats from './QuadrantStats';
import Agreements from '../../components/gabinete/Agreements';
import QuadrantDetailsModal from '../../components/gabinete/QuadrantDetailsModal';
import Attendance from '../../components/gabinete/Attendance';

const Gabinete = () => {
    const { user } = useSelector(state => state.user);
    const [activeTab, setActiveTab] = useState('cuadrantes');
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [selectedQuadrant, setSelectedQuadrant] = useState(null);
    const [showQuadrantDetails, setShowQuadrantDetails] = useState(false);
    const [filteredIncidents, setFilteredIncidents] = useState([]);
    const [cuadrantesData, setCuadrantesData] = useState(null);
    const [editingIncidentId, setEditingIncidentId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [modalFilters, setModalFilters] = useState({
        search: '',
        date: '',
        from: '',
        to: '',
        impact: 'all',
        incidentType: 'all',
        status: 'all',
        reportedBy: ''
    });
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [attendanceSuccess, setAttendanceSuccess] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].split('-')[1]);
    const mapRef = useRef();
    const [modalSelectedIncident, setModalSelectedIncident] = useState(null);
    // Estados para feedback de guardado/edición de incidentes
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(() => {
        // Valor inicial: semana actual en formato 'YYYY-Www'
        const now = new Date();
        const year = now.getFullYear();
        // Obtener semana ISO
        const getWeekNumber = d => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return weekNo;
        };
        const week = String(getWeekNumber(now)).padStart(2, '0');
        return `${year}-W${week}`;
    });

    // Función para manejar el cambio de pestaña con scroll
    const handleTabSelect = (tab) => {
        setActiveTab(tab);
        // Esperar a que el contenido se renderice
        setTimeout(() => {
            const tabContent = document.querySelector('.tab-content');
            if (tabContent) {
                tabContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    // Redirigir a cuadrantes si no es admin y está en asistencia o peticiones
    useEffect(() => {
        if (!isAdmin(user) && (activeTab === 'asistencia' || activeTab === 'peticiones')) {
            setActiveTab('cuadrantes');
        }
    }, [user, activeTab]);

    // Cargar datos de cuadrantes y incidentes
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Cargar datos de cuadrantes
                const response = await fetch('/data/tlatelolco_quadrants.geojson');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Filtrar solo los cuadrantes relevantes (1-12)
                const filteredFeatures = data.features.filter(feature =>
                    feature.properties.no_cdrn >= 1 && feature.properties.no_cdrn <= 12
                );

                setCuadrantesData({
                    ...data,
                    features: filteredFeatures
                });

                // Cargar incidentes
                const incidentsResponse = await getIncidents();
                console.log('Incidentes recibidos:', incidentsResponse.data);

                // Asignar cuadrantes a los incidentes usando turf
                const incidentsWithQuadrants = incidentsResponse.data.map(incident => {
                    let lng, lat;
                    const coords = incident.location.coordinates;
                    if (Array.isArray(coords)) {
                        lng = coords[0];
                        lat = coords[1];
                        // Si lat está fuera de rango, probablemente el orden es [lat, lng]
                        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
                            [lat, lng] = [lng, lat];
                        }
                    } else {
                        lng = coords.lng;
                        lat = coords.lat;
                    }

                    const point = turf.point([lng, lat]);
                    let foundQuadrant = null;

                    for (const feature of filteredFeatures) {
                        if (turf.booleanPointInPolygon(point, feature)) {
                            foundQuadrant = feature.properties.no_cdrn;
                            break;
                        }
                    }

                    console.log(`Incidente en ${lat}, ${lng} asignado al cuadrante ${foundQuadrant}`);

                    return {
                        ...incident,
                        quadrant: foundQuadrant
                    };
                });

                console.log('Incidentes con cuadrantes:', incidentsWithQuadrants);
                setIncidents(incidentsWithQuadrants);
                setLoading(false);
            } catch (err) {
                console.error('Error al cargar los datos:', err);
                setError('Error al cargar los datos: ' + err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Cargar asistencias guardadas
    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const data = await getAttendance();
                setAttendance(data);
            } catch (err) {
                // Puedes mostrar un error si lo deseas
            }
        };
        fetchAttendance();
    }, []);

    const handleQuadrantClick = (quadrantNumber) => {
        setSelectedQuadrant(quadrantNumber);
        const quadrantIncidents = incidents.filter(incident => incident.quadrant === quadrantNumber);
        console.log(`Incidentes para cuadrante ${quadrantNumber}:`, quadrantIncidents);
        setFilteredIncidents(quadrantIncidents);
        setShowQuadrantDetails(true);
    };

    // Datos de ejemplo para la asistencia
    const participants = [
        { id: 1, name: 'Fiscalía General de Justicia', role: 'Dependencia' },
        { id: 2, name: 'Secretaría de Seguridad Ciudadana', role: 'Dependencia' },
        { id: 3, name: 'Policía de Investigación', role: 'Dependencia' },
        { id: 4, name: 'Inteligencia Social', role: 'Dependencia' },
        { id: 5, name: 'Justicia Cívica', role: 'Dependencia' },
        { id: 6, name: 'LCP SAPCI', role: 'Dependencia' },
        { id: 7, name: 'Representante Jefatura de Gobierno', role: 'Dependencia' },
        { id: 8, name: 'Alcaldía', role: 'Dependencia' }
    ];

    const [attendanceData, setAttendanceData] = useState({});

    const handleAttendanceSubmit = async (e) => {
        e.preventDefault();
        setAttendanceLoading(true);
        setAttendanceError(null);
        setAttendanceSuccess(null);
        try {
            const newAttendance = {
                date: selectedDate,
                participants: participants.map(participant => ({
                    participantId: participant.id,
                    attendance: attendanceData[participant.id] || 'ausente'
                }))
            };
            await createAttendance(newAttendance);
            setAttendanceSuccess('¡Asistencia registrada correctamente!');
            setTimeout(() => {
                setShowAttendanceModal(false);
                setAttendanceSuccess(null);
            }, 1200);
        } catch (err) {
            setAttendanceError('Error al registrar asistencia: ' + (err?.response?.data?.error || err.message));
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleAttendanceChange = (participantId, value) => {
        setAttendanceData(prev => ({
            ...prev,
            [participantId]: value
        }));
    };

    // Función para manejar la edición de incidentes
    const handleEditIncident = (incident) => {
        setEditingIncidentId(incident._id);
        setEditForm({
            type: incident.type,
            crimeType: incident.crimeType,
            crimeImpact: incident.crimeImpact,
            location: {
                street: incident.location.street,
                coordinates: incident.location.coordinates
            },
            date: incident.date,
            description: incident.description,
            reportedBy: incident.reportedBy,
            status: incident.status
        });
    };

    // Función para manejar cambios en el formulario de edición
    const handleEditChange = (e, field, subfield) => {
        if (subfield) {
            setEditForm(prev => ({
                ...prev,
                [field]: { ...prev[field], [subfield]: e.target.value }
            }));
        } else {
            setEditForm(prev => ({ ...prev, [field]: e.target.value }));
        }
    };

    // Función para guardar los cambios del incidente
    const handleSaveIncident = async (incidentId) => {
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            const payload = {
                ...editForm,
                location: {
                    ...editForm.location,
                    coordinates: editForm.location.coordinates
                }
            };

            // Aquí iría la llamada a la API para actualizar el incidente
            // await updateIncident(incidentId, payload);

            // Actualizar el estado local
            setIncidents(prev =>
                prev.map(i => (i._id === incidentId ? { ...i, ...payload } : i))
            );

            setSaveSuccess('Guardado exitosamente');
            setTimeout(() => {
                setEditingIncidentId(null);
                setEditForm({});
                setSaveSuccess(null);
            }, 1000);
        } catch (err) {
            setSaveError('Error al guardar: ' + (err?.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Función para cancelar la edición
    const handleCancelEdit = () => {
        setEditingIncidentId(null);
        setEditForm({});
        setSaveError(null);
        setSaveSuccess(null);
    };

    // Lógica de filtrado local para el modal
    const filterModalIncidents = (incidents) => {
        return incidents.filter(incident => {
            // Impacto
            if (modalFilters.impact !== 'all' && incident.crimeImpact !== modalFilters.impact) return false;
            // Día
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
            // Reportado por
            if (modalFilters.reportedBy && incident.reportedBy) {
                if (!incident.reportedBy.toLowerCase().includes(modalFilters.reportedBy.toLowerCase())) {
                    return false;
                }
            }
            // Tipo de incidente
            if (modalFilters.incidentType !== 'all' && incident.type !== modalFilters.incidentType) {
                return false;
            }
            // Estado
            if (modalFilters.status !== 'all' && incident.status !== modalFilters.status) {
                return false;
            }
            // Búsqueda por texto
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

    // Función para obtener el rango de fechas (lunes a viernes) de una semana ISO en zona local
    function getWeekRange(isoWeek) {
        const [year, week] = isoWeek.split('-W').map(Number);

        // El 4 de enero siempre está en la semana 1 ISO
        const jan4 = new Date(year, 0, 4);
        let dayOfWeek = jan4.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7; // ISO: domingo=7
        // Lunes de la semana 1 ISO (en local)
        const monday = new Date(jan4);
        monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);

        // Generar lunes a viernes, normalizando a 00:00:00 local
        return Array.from({ length: 5 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            d.setHours(0, 0, 0, 0);
            return d;
        });
    }

    // Filtrar asistencias de la semana seleccionada usando compensación por zona horaria
    const weekDates = getWeekRange(selectedWeek);

    // Función auxiliar para obtener solo año/mes/día REAL según la fecha guardada en MongoDB
    const getLocalDateOnly = (dateString) => {
        // Para una fecha como "2025-05-15T00:00:00.000+00:00" necesitamos extraer 
        // solo la parte "2025-05-15" y tratarla como la fecha real
        // independientemente de la zona horaria

        // Extraer solo la parte de la fecha (YYYY-MM-DD)
        const datePart = dateString.split('T')[0];
        if (!datePart) return new Date(); // Fallback

        // Convertir a componentes
        const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));

        // Crear fecha con estos componentes exactos (sin ajuste de zona)
        return new Date(year, month - 1, day, 12, 0, 0);
    };

    // Crear fechas límite sin tiempo (solo año, mes, día local)
    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);  // Inicio del lunes

    const weekEnd = new Date(weekDates[4]);
    weekEnd.setHours(23, 59, 59, 999);  // Fin del viernes

    // Este filtro debe considerar que los datos del backend están en UTC
    const weekAttendance = attendance.filter(a => {
        // Ajustar la fecha del backend (UTC) a local para comparación
        const attendanceLocalDate = getLocalDateOnly(a.date);
        // Verificar si la fecha local está dentro del rango de la semana local
        return attendanceLocalDate >= weekStart && attendanceLocalDate <= weekEnd;
    });

    // Resumen por semana y por mes
    const summary = {};
    participants.forEach(part => {
        summary[part.id] = {
            name: part.name,
            week: { titular: 0, suplente: 0, ausente: 0 },
            month: { titular: 0, suplente: 0, ausente: 0 }
        };
    });

    // Por semana
    weekAttendance.forEach(a => {
        a.participants.forEach(p => {
            const id = String(p.participantId._id || p.participantId);
            if (summary[id]) {
                summary[id].week[p.attendance]++;
            }
        });
    });

    // Por mes actual
    const now = new Date();
    const monthAttendance = attendance.filter(a => {
        const d = new Date(a.date);
        if (selectedMonth) {
            const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
            return d.getFullYear() === selectedYear && d.getMonth() === selectedMonthNum - 1;
        }
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    monthAttendance.forEach(a => {
        a.participants.forEach(p => {
            const id = String(p.participantId._id || p.participantId);
            if (summary[id]) {
                summary[id].month[p.attendance]++;
            }
        });
    });

    // Actualizar el estado inicial del mes seleccionado
    useEffect(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
    }, []);

    // --- Variables para el mapa del modal de cuadrante ---
    let modalMapCenter = [19.4555, -99.1405];
    let modalGeoFeature = null;
    let modalBounds = null;
    if (cuadrantesData && selectedQuadrant) {
        modalGeoFeature = cuadrantesData.features.find(f => f.properties.no_cdrn === selectedQuadrant);
        if (modalGeoFeature) {
            try {
                const turfBbox = require('@turf/turf').bbox(modalGeoFeature);
                // bbox: [minX, minY, maxX, maxY] => [west, south, east, north]
                modalMapCenter = [
                    (turfBbox[1] + turfBbox[3]) / 2, // (south + north) / 2 = lat
                    (turfBbox[0] + turfBbox[2]) / 2  // (west + east) / 2 = lng
                ];
                modalBounds = [
                    [turfBbox[1], turfBbox[0]], // [south, west]
                    [turfBbox[3], turfBbox[2]]  // [north, east]
                ];
            } catch { }
        }
    }

    // Centrar el mapa del modal cuando se abre y hay bounds
    useEffect(() => {
        if (showQuadrantDetails && mapRef.current && modalBounds) {
            setTimeout(() => {
                mapRef.current.fitBounds(modalBounds, { maxZoom: 16, padding: [30, 30] });
                setTimeout(() => {
                    mapRef.current.setView(modalMapCenter, mapRef.current.getZoom());
                }, 150);
            }, 200);
        }
    }, [showQuadrantDetails, modalBounds, modalMapCenter]);

    // --- Función para color de cuadrante igual que en Map.jsx ---
    const getQuadrantColor = (quadrantNumber) => {
        // Incidentes filtrados para este cuadrante
        const quadrantIncidents = filterModalIncidents(filteredIncidents).filter(i => i.quadrant === quadrantNumber);
        const count = quadrantIncidents.length;
        // Si hay filtro de tipo de incidente activo, usar un color específico para ese tipo
        if (modalFilters && modalFilters.incidentType && modalFilters.incidentType !== 'all') {
            switch (modalFilters.incidentType) {
                case 'Infestación':
                    return count === 0 ? '#4CAF50' : '#8B4513';
                case 'Personas en situación de calle':
                    return count === 0 ? '#4CAF50' : '#4682B4';
                case 'Poda de árboles':
                    return count === 0 ? '#4CAF50' : '#228B22';
                case 'Tránsito de motocicletas':
                    return count === 0 ? '#4CAF50' : '#FF8C00';
                case 'Robo de autopartes':
                    return count === 0 ? '#4CAF50' : '#B22222';
                case 'Iluminación':
                    return count === 0 ? '#4CAF50' : '#FFD700';
                case 'Cámaras':
                    return count === 0 ? '#4CAF50' : '#4B0082';
                case 'Petición ciudadana':
                    return count === 0 ? '#4CAF50' : '#20B2AA';
                case 'Otro':
                    return count === 0 ? '#4CAF50' : '#808080';
                default:
                    break;
            }
        }
        // Si no hay filtro de tipo o es tipo crimen, usar la escala de colores original
        if (count === 0) return '#4CAF50'; // Verde
        if (count < 3) return '#FFC107'; // Amarillo
        if (count < 6) return '#FF9800'; // Naranja
        return '#F44336'; // Rojo
    };

    if (loading) {
        return (
            <Container fluid className="gabinete-container py-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container fluid className="gabinete-container py-4">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="gabinete-container py-4">
            <h2 className="text-center mb-4">Gabinete Tlatelolco</h2>

            <Nav variant="tabs" className="mb-4 justify-content-center nav-tabs-custom" onSelect={handleTabSelect} activeKey={activeTab}>
                <Nav.Item>
                    <Nav.Link eventKey="cuadrantes" className="nav-link-custom">Cuadrantes</Nav.Link>
                </Nav.Item>
                {isAdmin(user) && (
                    <Nav.Item>
                        <Nav.Link eventKey="asistencia" className="nav-link-custom">Asistencia</Nav.Link>
                    </Nav.Item>
                )}
                <Nav.Item>
                    <Nav.Link eventKey="acuerdos" className="nav-link-custom">Acuerdos</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="consignas" className="nav-link-custom">Consignas Especiales</Nav.Link>
                </Nav.Item>
                {isAdmin(user) && (
                    <Nav.Item>
                        <Nav.Link eventKey="peticiones" className="nav-link-custom">Peticiones Ciudadanas</Nav.Link>
                    </Nav.Item>
                )}
            </Nav>

            <Tab.Content className="tab-content-custom">
                {/* Sección de Cuadrantes */}
                <Tab.Pane active={activeTab === 'cuadrantes'}>
                    <Row>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(quadrantNumber => {
                            return (
                                <Col key={quadrantNumber} xs={12} sm={6} md={4} className="mb-3">
                                    <Card className="h-100 shadow-sm hover-card">
                                        <Card.Header className="quadrant-header py-2">
                                            <h5 className="mb-0">Cuadrante {quadrantNumber}</h5>
                                        </Card.Header>
                                        <Card.Body className="quadrant-body py-2">
                                            <MiniIncidentMap
                                                feature={cuadrantesData.features.find(f => f.properties.no_cdrn === quadrantNumber)}
                                                onQuadrantClick={handleQuadrantClick}
                                            />
                                            <QuadrantStats incidents={incidents} quadrantNumber={quadrantNumber} />
                                        </Card.Body>
                                        <Card.Footer className="quadrant-footer py-2">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="w-100"
                                                onClick={() => handleQuadrantClick(quadrantNumber)}
                                            >
                                                Ver Detalles
                                            </Button>
                                        </Card.Footer>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    {/* Modal de Detalles del Cuadrante */}
                    <QuadrantDetailsModal
                        show={showQuadrantDetails}
                        onHide={() => setShowQuadrantDetails(false)}
                        selectedQuadrant={selectedQuadrant}
                        cuadrantesData={cuadrantesData}
                        filteredIncidents={filteredIncidents}
                        modalFilters={modalFilters}
                        setModalFilters={setModalFilters}
                        getQuadrantColor={getQuadrantColor}
                        setModalSelectedIncident={setModalSelectedIncident}
                        modalSelectedIncident={modalSelectedIncident}
                        handleEditIncident={handleEditIncident}
                        setEditingIncidentId={setEditingIncidentId}
                        setEditForm={setEditForm}
                        editingIncidentId={editingIncidentId}
                        editForm={editForm}
                        handleEditChange={handleEditChange}
                        handleSaveIncident={handleSaveIncident}
                        handleCancelEdit={handleCancelEdit}
                        getStatusBadgeClass={getStatusBadgeClass}
                        INCIDENT_TYPES={INCIDENT_TYPES}
                        mapRef={mapRef}
                    />
                </Tab.Pane>

                {/* Sección de Asistencia */}
                <Tab.Pane active={activeTab === 'asistencia'}>
                    <Attendance />
                </Tab.Pane>

                {/* Sección de Acuerdos */}
                <Tab.Pane active={activeTab === 'acuerdos'}>
                    <Agreements />
                </Tab.Pane>

                {/* Sección de Consignas Especiales */}
                <Tab.Pane active={activeTab === 'consignas'}>
                    <SpecialInstructions />
                </Tab.Pane>

                {/* Sección de Peticiones Ciudadanas */}
                <Tab.Pane active={activeTab === 'peticiones'}>
                    <CitizenRequests />
                </Tab.Pane>
            </Tab.Content>

            {/* Modal de Asistencia */}
            <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Tomar Asistencia</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAttendanceSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label>Fecha</Form.Label>
                            <Form.Control
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </Form.Group>
                        <div className="attendance-list">
                            {participants.map(participant => (
                                <div key={participant.id} className="attendance-item mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-1">{participant.name}</h6>
                                            <small className="text-muted">{participant.role}</small>
                                        </div>
                                        <div className="attendance-options">
                                            <Form.Check
                                                type="radio"
                                                id={`titular-${participant.id}`}
                                                label="Titular"
                                                name={`attendance-${participant.id}`}
                                                value="titular"
                                                onChange={() => handleAttendanceChange(participant.id, 'titular')}
                                                checked={attendanceData[participant.id] === 'titular'}
                                                className="me-3"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id={`suplente-${participant.id}`}
                                                label="Suplente"
                                                name={`attendance-${participant.id}`}
                                                value="suplente"
                                                onChange={() => handleAttendanceChange(participant.id, 'suplente')}
                                                checked={attendanceData[participant.id] === 'suplente'}
                                                className="me-3"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id={`ausente-${participant.id}`}
                                                label="Ausente"
                                                name={`attendance-${participant.id}`}
                                                value="ausente"
                                                onChange={() => handleAttendanceChange(participant.id, 'ausente')}
                                                checked={attendanceData[participant.id] === 'ausente' || !attendanceData[participant.id]}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {attendanceError && <div className="text-danger mt-3">{attendanceError}</div>}
                        {attendanceSuccess && <div className="text-success mt-3">{attendanceSuccess}</div>}
                        <div className="d-flex justify-content-end mt-4">
                            <Button variant="secondary" className="me-2" onClick={() => setShowAttendanceModal(false)} disabled={attendanceLoading}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" disabled={attendanceLoading}>
                                {attendanceLoading ? 'Guardando...' : 'Guardar Asistencia'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container >
    );
};

export default Gabinete; 