import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import L from 'leaflet';
import './Map.css';
import { getIncidents, updateIncident, createIncident, deleteIncident } from '../../services/incidents';
import * as turf from '@turf/turf';
import { useSelector } from 'react-redux';
import { isAdmin } from '../../utils/auth';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const INCIDENT_TYPES = {
    CRIME: 'Delito',
    TREE_TRIMMING: 'Poda de árboles',
    HOMELESS: 'Personas en situación de calle',
    MOTORCYCLE_TRAFFIC: 'Tránsito de motocicletas',
    AUTO_PARTS_THEFT: 'Robo de autopartes',
    LIGHTING: 'Iluminación',
    INFESTATION: 'Infestación',
    CAMERAS: 'Cámaras',
    CITIZEN_PETITION: 'Petición ciudadana',
    OTHER: 'Otro'
};
const DELITOS_ALTO_IMPACTO = [
    'Homicidio', 'Feminicidio', 'Secuestro', 'Extorsión', 'Robo con violencia',
    'Robo de vehículo con violencia', 'Robo a casa habitación con violencia',
    'Robo a negocio con violencia', 'Violación', 'Trata de personas', 'Desaparición forzada', 'Despojo',
    'Allanamiento de domicilio', 'Daño a propiedad culposo', 'Robo a transeunte en la vía pública con violencia'
];
const DELITOS_BAJO_IMPACTO = [
    'Robo a transeunte en la vía pública sin violencia', 'Robo de vehículo sin violencia', 'Robo a casa habitación sin violencia',
    'Robo a negocio sin violencia', 'Acoso en la vía pública', 'Fraude', 'Falsificación de documentos',
    'Lesiones menores (sin hospitalización)', 'Quejas por ruido', 'Vandalismo', 'Violencia familiar',
    'Posesión de drogas para consumo personal', 'Amenazas', 'Robo de autopartes', 'Robo sin violencia'
];

const INFESTATION_TYPES = {
    RATS: 'Ratas',
    COCKROACHES: 'Cucarachas'
};

const Map = ({ onQuadrantClick }) => {
    const [cuadrantesData, setCuadrantesData] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuadrant, setSelectedQuadrant] = useState(null);
    const [filters, setFilters] = useState({
        crimeType: 'all',
        impact: 'all',
        date: '',
        from: '',
        to: '',
        reportedBy: '',
        incidentType: 'all',
        status: 'all',
        search: '',
        delitoTipo: 'all'
    });
    const [showIncidents, setShowIncidents] = useState(false);
    const [editingIncidentId, setEditingIncidentId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportForm, setReportForm] = useState({
        type: '',
        crimeType: '',
        date: '',
        time: '',
        location: { street: '', lat: '', lng: '', additionalInfo: '' },
        description: '',
        reportedBy: '',
        contactInfo: { phone: '', email: '' },
        additionalDetails: {
            infestationType: '',
            severity: '',
            notes: '',
            otherTypeDescription: ''
        }
    });
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState(null);
    const [reportSuccess, setReportSuccess] = useState(false);
    const mapRef = useRef();
    const popupLayerRef = useRef();

    const center = [19.4555, -99.1405];

    const [selectedIncident, setSelectedIncident] = useState(null);

    // Obtener el nivel de zoom actual
    const [popupZoomClass, setPopupZoomClass] = useState('zoom-medium');

    const getZoomClass = (zoom) => {
        if (zoom >= 17) return 'zoom-small';
        if (zoom <= 14) return 'zoom-large';
        return 'zoom-medium';
    };

    // Actualizar la clase de zoom cuando cambia el zoom del mapa
    useEffect(() => {
        if (!mapRef.current) return;
        const handleZoom = () => {
            const zoom = mapRef.current.getZoom();
            setPopupZoomClass(getZoomClass(zoom));
        };
        mapRef.current.on('zoomend', handleZoom);
        // Inicial
        handleZoom();
        return () => {
            if (mapRef.current) mapRef.current.off('zoomend', handleZoom);
        };
    }, [mapRef]);

    useEffect(() => {
        const fetchData = async () => {
            try {
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
                    return { ...incident, quadrant: foundQuadrant };
                });
                setIncidents(incidentsWithQuadrants);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Permitir que el popup de Leaflet active la vista de incidentes
    useEffect(() => {
        window.showIncidentsForQuadrant = () => setShowIncidents(true);
        window.closeActivePopup = () => {
            if (popupLayerRef.current) {
                popupLayerRef.current.closePopup();
            }
        };
        return () => {
            delete window.showIncidentsForQuadrant;
            delete window.closeActivePopup;
        };
    }, []);

    // Función para actualizar los filtros
    const updateFilters = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Función para verificar si un incidente está en el rango de fechas
    const isIncidentInRange = (incidentDate) => {
        const date = new Date(incidentDate);
        date.setHours(date.getHours() - 6);

        if (filters.from) {
            const from = new Date(filters.from);
            from.setHours(0, 0, 0, 0);
            if (date < from) return false;
        }

        if (filters.to) {
            const to = new Date(filters.to);
            to.setHours(23, 59, 59, 999);
            if (date > to) return false;
        }

        return true;
    };

    // Función para filtrar incidentes según los filtros seleccionados
    const filterIncidents = (incidents) => {
        if (!incidents || incidents.length === 0) return [];

        return incidents.filter(incident => {
            try {
                // Filtro por impacto
                if (filters.impact !== 'all' && incident.crimeImpact !== filters.impact) return false;

                // Filtro por tipo de delito
                if (filters.delitoTipo !== 'all' && incident.crimeType !== filters.delitoTipo) {
                    return false;
                }

                // Filtro por día
                if (filters.date) {
                    const incidentDate = new Date(incident.date);
                    incidentDate.setHours(incidentDate.getHours() - 6);
                    const selectedDate = new Date(filters.date);
                    selectedDate.setHours(0, 0, 0, 0);
                    if (
                        incidentDate.getFullYear() !== selectedDate.getFullYear() ||
                        incidentDate.getMonth() !== selectedDate.getMonth() ||
                        incidentDate.getDate() !== selectedDate.getDate()
                    ) {
                        return false;
                    }
                }

                // Filtro por rango de fechas
                if ((filters.from || filters.to) && !isIncidentInRange(incident.date)) {
                    return false;
                }

                // Filtro por reportado por
                if (filters.reportedBy && incident.reportedBy) {
                    if (!incident.reportedBy.toLowerCase().includes(filters.reportedBy.toLowerCase())) {
                        return false;
                    }
                }

                // Filtro por tipo de incidente
                if (filters.incidentType !== 'all' && incident.type !== filters.incidentType) {
                    return false;
                }

                // Filtro por status
                if (filters.status !== 'all' && incident.status !== filters.status) {
                    return false;
                }

                // Filtro de búsqueda por texto
                if (filters.search.trim() !== '') {
                    const search = filters.search.trim().toLowerCase();
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
            } catch (error) {
                console.error('Error al filtrar incidente:', error);
                return false;
            }
        });
    };

    // Usar los incidentes filtrados en todos los conteos y visualizaciones
    const getQuadrantIncidents = (quadrantNumber) => {
        // Primero filtramos por cuadrante
        const quadrantIncidents = incidents.filter(incident => incident.quadrant === quadrantNumber);

        // Si no hay incidentes en el cuadrante, retornar array vacío
        if (quadrantIncidents.length === 0) return [];

        // Aplicar todos los filtros
        return filterIncidents(quadrantIncidents);
    };

    // Obtener todos los incidentes filtrados para mostrar como marcadores
    const filteredMarkers = filterIncidents(incidents);

    // Función para obtener el color del cuadrante
    const getQuadrantColor = (quadrantNumber) => {
        const quadrantIncidents = getQuadrantIncidents(quadrantNumber);
        const count = quadrantIncidents.length;

        // Si hay un filtro de tipo de incidente activo, usar un color específico para ese tipo
        if (filters.incidentType !== 'all') {
            switch (filters.incidentType) {
                case INCIDENT_TYPES.INFESTATION:
                    return count === 0 ? '#4CAF50' : '#8B4513'; // Verde si no hay incidentes, marrón si hay
                case INCIDENT_TYPES.HOMELESS:
                    return count === 0 ? '#4CAF50' : '#4682B4'; // Verde si no hay incidentes, azul acero si hay
                case INCIDENT_TYPES.TREE_TRIMMING:
                    return count === 0 ? '#4CAF50' : '#228B22'; // Verde si no hay incidentes, verde bosque si hay
                case INCIDENT_TYPES.MOTORCYCLE_TRAFFIC:
                    return count === 0 ? '#4CAF50' : '#FF8C00'; // Verde si no hay incidentes, naranja oscuro si hay
                case INCIDENT_TYPES.AUTO_PARTS_THEFT:
                    return count === 0 ? '#4CAF50' : '#B22222'; // Verde si no hay incidentes, rojo fuego si hay
                case INCIDENT_TYPES.LIGHTING:
                    return count === 0 ? '#4CAF50' : '#FFD700'; // Verde si no hay incidentes, dorado si hay
                case INCIDENT_TYPES.CAMERAS:
                    return count === 0 ? '#4CAF50' : '#4B0082'; // Verde si no hay incidentes, índigo si hay
                case INCIDENT_TYPES.CITIZEN_PETITION:
                    return count === 0 ? '#4CAF50' : '#20B2AA'; // Verde si no hay incidentes, verde azulado si hay
                case INCIDENT_TYPES.OTHER:
                    return count === 0 ? '#4CAF50' : '#808080'; // Verde si no hay incidentes, gris si hay
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

    const cuadranteStyle = (feature) => {
        try {
            const quadrantNumber = feature.properties.no_cdrn;
            const color = getQuadrantColor(quadrantNumber);
            return {
                fillColor: color,
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        } catch (error) {
            console.error('Error al aplicar estilo al cuadrante:', error);
            return {
                fillColor: '#4CAF50',
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        }
    };

    const handleQuadrantClick = (quadrantNumber) => {
        setSelectedQuadrant(quadrantNumber);
        if (onQuadrantClick) {
            onQuadrantClick(quadrantNumber);
        }
    };

    const onEachCuadrante = (feature, layer) => {
        try {
            const quadrantNumber = feature.properties.no_cdrn;
            // Usar incidentes filtrados por cuadrante y por todos los filtros activos
            const quadrantIncidents = filterIncidents(incidents.filter(incident => incident.quadrant === quadrantNumber));
            const statistics = {
                total: quadrantIncidents.length,
                highImpact: quadrantIncidents.filter(i => i.crimeImpact === 'ALTO').length,
                lowImpact: quadrantIncidents.filter(i => i.crimeImpact === 'BAJO').length,
                byType: {}
            };
            quadrantIncidents.forEach(incident => {
                if (!statistics.byType[incident.crimeType]) statistics.byType[incident.crimeType] = 0;
                statistics.byType[incident.crimeType]++;
            });

            // Aplicar el estilo inicial según los filtros activos
            const initialStyle = cuadranteStyle(feature);
            layer.setStyle(initialStyle);

            // Guardar el layer cuando se abre el popup
            layer.on('popupopen', () => {
                popupLayerRef.current = layer;
            });

            // Evento: click
            layer.on('click', () => handleQuadrantClick(quadrantNumber));

            // Evento: mouseover
            layer.on('mouseover', () => {
                const currentColor = layer.options.fillColor;
                const hoverStyle = {
                    fillColor: currentColor,
                    weight: 5,
                    opacity: 1,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.9
                };
                layer.setStyle(hoverStyle);
                layer.bringToFront();
            });

            // Evento: mouseout
            layer.on('mouseout', () => {
                const currentColor = layer.options.fillColor;
                const initialStyle = {
                    fillColor: currentColor,
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
                layer.setStyle(initialStyle);
            });

            // Crear el contenido del popup
            const zoom = mapRef.current ? mapRef.current.getZoom() : 15;
            const zoomClass = getZoomClass(zoom);
            const popupContent = `
                <div class="cuadrante-popup ${zoomClass}">
                    <button class="popup-close-btn" onclick="window.closeActivePopup && window.closeActivePopup()" title="Cerrar">×</button>
                    <div class="cuadrante-popup-header">Cuadrante ${quadrantNumber}</div>
                    <div class="cuadrante-popup-card summary-row">
                        <span class="summary-label">Total:</span><span class="summary-value summary-value-total">${statistics.total}</span>
                        <span class="summary-label">Alto:</span><span class="summary-value summary-value-high">${statistics.highImpact}</span>
                        <span class="summary-label">Bajo:</span><span class="summary-value summary-value-low">${statistics.lowImpact}</span>
                    </div>
                    <div class="cuadrante-popup-card">
                        <div class="cuadrante-popup-card-title">Tipos de Delitos</div>
                        ${Object.entries(statistics.byType).map(([type, count]) => {
                const isHigh = DELITOS_ALTO_IMPACTO.includes(type);
                const isLow = DELITOS_BAJO_IMPACTO.includes(type);
                const valueClass = isHigh ? 'summary-value summary-value-high' : isLow ? 'summary-value summary-value-low' : 'summary-value';
                return `<div class='summary-row' style='display:flex;align-items:center;gap:6px;margin:0 0 2px 0;'><span class='summary-label' style='font-size:13px;'>${type}</span><span class='${valueClass}' style='font-size:15px;'>${count}</span></div>`;
            }).join('')}
                    </div>
                    <div class="cuadrante-popup-footer">
                        <button class="popup-button" onclick="window.showIncidentsForQuadrant && window.showIncidentsForQuadrant()">
                            Ver incidentes
                        </button>
                    </div>
                </div>
            `;

            layer.bindPopup(popupContent);
        } catch (error) {
            console.error('Error al configurar cuadrante:', error);
        }
    };

    const getMarkerIcon = (incident) => {
        let iconHtml = '';
        // Si es delito/crimen, usar icono de advertencia según impacto
        const type = (incident.type || '').trim().toLowerCase();
        if (type === 'crimen' || type === 'delito' || type === INCIDENT_TYPES.CRIME.toLowerCase()) {
            if (incident.crimeImpact === 'ALTO') {
                iconHtml = `<div style="color: #dc3545; font-size: 20px;"><i class="fa-solid fa-exclamation-triangle"></i></div>`;
            } else if (incident.crimeImpact === 'BAJO') {
                iconHtml = `<div style="color: #fbbf24; font-size: 20px;"><i class="fa-solid fa-exclamation-triangle"></i></div>`;
            } else {
                iconHtml = `<div style="color: #adb5bd; font-size: 20px;"><i class="fa-solid fa-exclamation-triangle"></i></div>`;
            }
        } else {
            let iconColor = incident.crimeImpact === 'ALTO' ? '#ff4444' : '#ffbb33';
            switch (type) {
                case INCIDENT_TYPES.TREE_TRIMMING.toLowerCase():
                case 'poda de árboles':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-tree"></i></div>`;
                    break;
                case INCIDENT_TYPES.HOMELESS.toLowerCase():
                case 'personas en situación de calle':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-person-walking"></i></div>`;
                    break;
                case INCIDENT_TYPES.MOTORCYCLE_TRAFFIC.toLowerCase():
                case 'tránsito de motocicletas':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-motorcycle"></i></div>`;
                    break;
                case INCIDENT_TYPES.AUTO_PARTS_THEFT.toLowerCase():
                case 'robo de autopartes':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-car"></i></div>`;
                    break;
                case INCIDENT_TYPES.LIGHTING.toLowerCase():
                case 'iluminación':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-lightbulb"></i></div>`;
                    break;
                case INCIDENT_TYPES.INFESTATION.toLowerCase():
                case 'infestación':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-bug"></i></div>`;
                    break;
                case INCIDENT_TYPES.CAMERAS.toLowerCase():
                case 'cámaras':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-video"></i></div>`;
                    break;
                case INCIDENT_TYPES.CITIZEN_PETITION.toLowerCase():
                case 'petición ciudadana':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-hand"></i></div>`;
                    break;
                case INCIDENT_TYPES.OTHER.toLowerCase():
                case 'otro':
                    iconHtml = `<div style="color: ${iconColor}; font-size: 20px;"><i class="fa-solid fa-question"></i></div>`;
                    break;
                default:
                    // Icono de advertencia para tipos no reconocidos
                    iconHtml = `<div style="color: #dc3545; font-size: 20px;"><i class="fa-solid fa-exclamation-triangle"></i></div>`;
            }
        }

        return L.divIcon({
            className: 'custom-marker',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    };

    // Handler para iniciar edición
    const handleEditIncident = (incident) => {
        // Extraer lat/lng correctamente
        let lat = '', lng = '';
        const coords = incident.location.coordinates;
        if (coords) {
            if (Array.isArray(coords)) {
                lng = coords[0];
                lat = coords[1];
                if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
                    [lat, lng] = [lng, lat];
                }
            } else {
                lng = coords.lng;
                lat = coords.lat;
            }
        }
        setEditingIncidentId(incident._id);
        setEditForm({
            crimeType: incident.crimeType,
            crimeImpact: incident.crimeImpact,
            location: {
                ...incident.location,
                lat: lat || '',
                lng: lng || ''
            },
            date: incident.date,
            description: incident.description || '',
            reportedBy: incident.reportedBy || '',
        });
        setSaveError(null);
        setSaveSuccess(null);
    };

    // Handler para cancelar edición
    const handleCancelEdit = () => {
        setEditingIncidentId(null);
        setEditForm({});
        setSaveError(null);
        setSaveSuccess(null);
    };

    // Handler para cambios en el formulario
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

    // Handler para guardar cambios
    const handleSaveIncident = async (incidentId) => {
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            const payload = {
                crimeType: editForm.crimeType,
                crimeImpact: editForm.crimeImpact,
                location: {
                    ...editForm.location,
                    street: editForm.location.street,
                    lat: editForm.location.lat,
                    lng: editForm.location.lng,
                },
                date: editForm.date,
                description: editForm.description,
                reportedBy: editForm.reportedBy,
            };
            await updateIncident(incidentId, payload);
            // Actualizar el estado local con el incidente editado
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

    const handleReportChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('location.')) {
            const field = name.split('.')[1];
            setReportForm(prev => ({ ...prev, location: { ...prev.location, [field]: value } }));
        } else if (name.startsWith('contactInfo.')) {
            const field = name.split('.')[1];
            setReportForm(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, [field]: value } }));
        } else if (name.startsWith('additionalDetails.')) {
            const field = name.split('.')[1];
            setReportForm(prev => ({ ...prev, additionalDetails: { ...prev.additionalDetails, [field]: value } }));
        } else {
            setReportForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        setReportLoading(true);
        setReportError(null);
        setReportSuccess(false);
        try {
            const { type, crimeType, date, time, location, description, reportedBy, contactInfo, additionalDetails } = reportForm;
            if (!type) throw new Error('El tipo de incidente es obligatorio');
            if (!date) throw new Error('La fecha es obligatoria');
            if (!location.street) throw new Error('La calle es obligatoria');
            if (!description || description.length < 10) throw new Error('La descripción debe tener al menos 10 caracteres');
            if (!reportedBy) throw new Error('El nombre del reportante es obligatorio');

            // Validar y formatear coordenadas
            let lat = location.lat ? Number(location.lat) : undefined;
            let lng = location.lng ? Number(location.lng) : undefined;

            // Validar rangos de coordenadas
            if (lat !== undefined && (lat < -90 || lat > 90)) {
                throw new Error('La latitud debe estar entre -90 y 90 grados');
            }
            if (lng !== undefined && (lng < -180 || lng > 180)) {
                throw new Error('La longitud debe estar entre -180 y 180 grados');
            }

            let payload = {
                type,
                date,
                time,
                location: {
                    street: location.street,
                    coordinates: {
                        lat: lat,
                        lng: lng
                    },
                    additionalInfo: location.additionalInfo
                },
                description,
                reportedBy
            };

            // Contact info
            if (contactInfo.phone || contactInfo.email) {
                payload.contactInfo = { ...contactInfo };
            }

            // Crimen
            if (type === INCIDENT_TYPES.CRIME) {
                if (!crimeType) throw new Error('El tipo de delito es obligatorio para incidentes de tipo crimen');
                payload.crimeType = crimeType;
                if (crimeType === 'Otro') {
                    if (!additionalDetails.otherTypeDescription) throw new Error('Para delitos de tipo "Otro", se requiere una descripción del tipo de delito');
                    payload.additionalDetails = { otherTypeDescription: additionalDetails.otherTypeDescription };
                }
            }

            // Infestación
            if (type === INCIDENT_TYPES.INFESTATION) {
                if (!additionalDetails.infestationType) throw new Error('Para incidentes de infestación, se debe especificar el tipo');
                payload.additionalDetails = {
                    infestationType: additionalDetails.infestationType,
                    severity: additionalDetails.severity,
                    notes: additionalDetails.notes
                };
            }

            // Notas y severidad para cualquier tipo
            if (additionalDetails.notes && !payload.additionalDetails) {
                payload.additionalDetails = {};
            }
            if (additionalDetails.notes) payload.additionalDetails.notes = additionalDetails.notes;
            if (additionalDetails.severity) payload.additionalDetails.severity = additionalDetails.severity;

            await createIncident(payload);
            setReportSuccess(true);
            setTimeout(() => {
                setShowReportModal(false);
                setReportForm({
                    type: '', crimeType: '', date: '', time: '', location: { street: '', lat: '', lng: '', additionalInfo: '' }, description: '', reportedBy: '', contactInfo: { phone: '', email: '' }, additionalDetails: { infestationType: '', severity: '', notes: '', otherTypeDescription: '' }
                });
                setReportSuccess(false);
            }, 1200);
        } catch (err) {
            setReportError(err.response?.data?.error || err.message);
        } finally {
            setReportLoading(false);
        }
    };

    const handleDeleteIncident = async (incidentId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este incidente? Esta acción no se puede deshacer.')) return;
        try {
            await deleteIncident(incidentId);
            // Actualizar la lista de incidentes tras eliminar
            setIncidents(prev => prev.filter(i => i._id !== incidentId));
        } catch (err) {
            alert('Error al eliminar el incidente: ' + (err.response?.data?.error || err.message));
        }
    };

    const user = useSelector(state => state.user.user);
    const canEdit = isAdmin(user);

    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="map-container d-flex justify-content-center align-items-center">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="map-wrapper">
                {/* Filtros */}
                <div className="map-filters map-filters-compact">
                    <div>
                        <label className="filter-label">Fecha</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={e => updateFilters({ date: e.target.value, from: '', to: '' })}
                            className="filter-input"
                            placeholder="Día"
                        />
                    </div>
                    <div>
                        <label className="filter-label">Desde</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={e => updateFilters({ from: e.target.value, date: '' })}
                            className="filter-input"
                            placeholder="Desde"
                        />
                    </div>
                    <div>
                        <label className="filter-label">Hasta</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={e => updateFilters({ to: e.target.value, date: '' })}
                            className="filter-input"
                            placeholder="Hasta"
                        />
                    </div>
                    <div>
                        <label className="filter-label">Impacto</label>
                        <select
                            value={filters.impact}
                            onChange={e => updateFilters({ impact: e.target.value })}
                            className="filter-input"
                        >
                            <option value="all">Todos</option>
                            <option value="ALTO">Alto</option>
                            <option value="BAJO">Bajo</option>
                        </select>
                    </div>
                    <div>
                        <label className="filter-label">Tipo de delito</label>
                        <select
                            value={filters.delitoTipo}
                            onChange={e => updateFilters({ delitoTipo: e.target.value })}
                            className="filter-input"
                        >
                            <option value="all">Todos</option>
                            <optgroup label="Alto Impacto">
                                {DELITOS_ALTO_IMPACTO.map(tipo => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Bajo Impacto">
                                {DELITOS_BAJO_IMPACTO.map(tipo => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="filter-label">Reportado por</label>
                        <input
                            type="text"
                            value={filters.reportedBy}
                            onChange={e => updateFilters({ reportedBy: e.target.value })}
                            className="filter-input"
                            placeholder="Nombre..."
                        />
                    </div>
                    <div>
                        <label className="filter-label">Tipo</label>
                        <select
                            value={filters.incidentType}
                            onChange={e => updateFilters({ incidentType: e.target.value })}
                            className="filter-input"
                        >
                            <option value="all">Todos</option>
                            {Object.entries(INCIDENT_TYPES).map(([key, value]) => (
                                <option key={key} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="filter-label">Estado</label>
                        <select
                            value={filters.status}
                            onChange={e => updateFilters({ status: e.target.value })}
                            className="filter-input"
                        >
                            <option value="all">Todos</option>
                            <option value="reportado">Reportado</option>
                            <option value="en investigación">En Investigación</option>
                            <option value="resuelto">Resuelto</option>
                            <option value="archivado">Archivado</option>
                        </select>
                    </div>
                </div>
                <div className="map-content">
                    <div className="map-container">
                        <MapContainer
                            center={center}
                            zoom={14}
                            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                            minZoom={13}
                            maxZoom={19}
                            dragging={true}
                            zoomControl={true}
                            scrollWheelZoom={true}
                            doubleClickZoom={true}
                            touchZoom={true}
                            whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {cuadrantesData && (
                                <GeoJSON
                                    key={`${filters.date}-${filters.from}-${filters.to}-${filters.impact}-${filters.incidentType}`}
                                    data={cuadrantesData}
                                    style={cuadranteStyle}
                                    onEachFeature={onEachCuadrante}
                                />
                            )}
                            {filteredMarkers.map((incident) => (
                                <Marker
                                    key={incident._id}
                                    position={[incident.location.coordinates.lat, incident.location.coordinates.lng]}
                                    icon={getMarkerIcon(incident)}
                                >
                                    <Popup>
                                        <div className={`incident-popup ${popupZoomClass}`}>
                                            <div className="incident-popup-header" style={{ alignItems: 'center', gap: 8 }}>
                                                <div className="incident-popup-icon">
                                                    <span dangerouslySetInnerHTML={{ __html: getMarkerIcon(incident).options.html }} />
                                                </div>
                                                <div className="incident-popup-title">
                                                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1em' }}>{incident.type === 'Crimen' || incident.type === INCIDENT_TYPES.CRIME ? 'Delito' : incident.type || 'Incidente'}</h3>
                                                    {incident.crimeType && <div style={{ fontWeight: 600, fontSize: '1em' }}>{incident.crimeType}</div>}
                                                </div>
                                            </div>
                                            <div className="incident-popup-content">
                                                <div className="row"><span className="label">Ubicación:</span><span className="value">{incident.location.street}</span></div>
                                                {incident.date && (
                                                    <div className="row"><span className="label">Fecha:</span><span className="value">{new Date(incident.date).toLocaleDateString()}{incident.time && ` ${incident.time}`}</span></div>
                                                )}
                                                {incident.description && (
                                                    <div className="row"><span className="label">Descripción:</span><span className="value">{incident.description}</span></div>
                                                )}
                                                {incident.reportedBy && (
                                                    <div className="row"><span className="label">Reportado por:</span><span className="value">{incident.reportedBy}</span></div>
                                                )}
                                                {incident.status && (
                                                    <div className="row"><span className="label">Estado:</span><span className="value">{incident.status}</span></div>
                                                )}
                                            </div>
                                            <div className="incident-popup-footer">
                                                <button
                                                    className="incident-popup-button"
                                                    onClick={() => {
                                                        setSelectedQuadrant(null);
                                                        setShowIncidents(false);
                                                        setSelectedIncident(incident);
                                                        const rightPanel = document.querySelector('.map-content > div:last-child');
                                                        if (rightPanel) {
                                                            rightPanel.style.display = 'block';
                                                        }
                                                    }}
                                                >
                                                    Más información
                                                </button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                    <div className="map-side-panel p-3 mb-4">
                        {showIncidents || selectedIncident ? null : (
                            <>
                                <h6 className="map-legend-title">Leyenda</h6>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                                    <span>Sin incidentes</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#FFC107' }}></div>
                                    <span>1-2 incidentes</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                                    <span>3-5 incidentes</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
                                    <span>6+ incidentes</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#ff4444' }}></div>
                                    <span>Alto Impacto</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#ffbb33' }}></div>
                                    <span>Bajo Impacto</span>
                                </div>
                            </>
                        )}
                        {showIncidents && !selectedIncident && (
                            <>
                                <div className="incidents-list">
                                    <div className="incidents-header">
                                        <h6>Incidentes del Cuadrante {selectedQuadrant}</h6>
                                        <button className="close-incidents" onClick={() => setShowIncidents(false)}>×</button>
                                    </div>
                                    <div className="incident-panel-report-btn">
                                        <button className="btn-report-incident" onClick={() => setShowReportModal(true)}>
                                            + Reportar Incidente
                                        </button>
                                    </div>
                                    {showReportModal && (
                                        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                                            <div className="modal-report-incident" onClick={e => e.stopPropagation()}>
                                                <button className="modal-close-btn" onClick={() => setShowReportModal(false)}>×</button>
                                                <h3 className="modal-title">Reportar Incidente</h3>
                                                <form className="modal-form" onSubmit={handleReportSubmit} autoComplete="off">
                                                    <div className="modal-form-row">
                                                        <select name="type" value={reportForm.type} onChange={handleReportChange} required>
                                                            <option value="">Tipo de Incidente *</option>
                                                            {Object.entries(INCIDENT_TYPES).map(([key, value]) => (
                                                                <option key={key} value={value}>{value}</option>
                                                            ))}
                                                        </select>
                                                        <input type="date" name="date" value={reportForm.date} onChange={handleReportChange} required />
                                                        <input type="time" name="time" value={reportForm.time} onChange={handleReportChange} />
                                                    </div>
                                                    {reportForm.type === INCIDENT_TYPES.CRIME && (
                                                        <div className="modal-form-row">
                                                            <select name="crimeType" value={reportForm.crimeType} onChange={handleReportChange} required>
                                                                <option value="">Tipo de Delito *</option>
                                                                <optgroup label="Alto Impacto">
                                                                    {DELITOS_ALTO_IMPACTO.map((crime) => (
                                                                        <option key={crime} value={crime}>{crime}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="Bajo Impacto">
                                                                    {DELITOS_BAJO_IMPACTO.map((crime) => (
                                                                        <option key={crime} value={crime}>{crime}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <option value="Otro">Otro</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    {reportForm.type === INCIDENT_TYPES.CRIME && reportForm.crimeType === 'Otro' && (
                                                        <div className="modal-form-row">
                                                            <input type="text" name="additionalDetails.otherTypeDescription" value={reportForm.additionalDetails.otherTypeDescription} onChange={handleReportChange} placeholder="Descripción del tipo de delito *" required />
                                                        </div>
                                                    )}
                                                    {reportForm.type === INCIDENT_TYPES.INFESTATION && (
                                                        <div className="modal-form-row">
                                                            <select name="additionalDetails.infestationType" value={reportForm.additionalDetails.infestationType} onChange={handleReportChange} required>
                                                                <option value="">Tipo de Infestación *</option>
                                                                {Object.entries(INFESTATION_TYPES).map(([key, value]) => (
                                                                    <option key={key} value={value}>{value}</option>
                                                                ))}
                                                            </select>
                                                            <select name="additionalDetails.severity" value={reportForm.additionalDetails.severity} onChange={handleReportChange}>
                                                                <option value="">Severidad</option>
                                                                <option value="baja">Baja</option>
                                                                <option value="media">Media</option>
                                                                <option value="alta">Alta</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div className="modal-form-row">
                                                        <input type="text" name="location.street" value={reportForm.location.street} onChange={handleReportChange} placeholder="Calle *" required />
                                                        <input type="text" name="location.additionalInfo" value={reportForm.location.additionalInfo} onChange={handleReportChange} placeholder="Info. adicional" />
                                                    </div>
                                                    <div className="modal-form-row">
                                                        <input type="number" name="location.lat" value={reportForm.location.lat} onChange={handleReportChange} placeholder="Latitud" step="any" />
                                                        <input type="number" name="location.lng" value={reportForm.location.lng} onChange={handleReportChange} placeholder="Longitud" step="any" />
                                                    </div>
                                                    <div className="modal-form-row">
                                                        <textarea name="description" value={reportForm.description} onChange={handleReportChange} placeholder="Descripción * (mínimo 10 caracteres)" rows={2} required />
                                                    </div>
                                                    <div className="modal-form-row">
                                                        <input type="text" name="reportedBy" value={reportForm.reportedBy} onChange={handleReportChange} placeholder="Reportado por *" required />
                                                        <input type="tel" name="contactInfo.phone" value={reportForm.contactInfo.phone} onChange={handleReportChange} placeholder="Teléfono" />
                                                        <input type="email" name="contactInfo.email" value={reportForm.contactInfo.email} onChange={handleReportChange} placeholder="Email" />
                                                    </div>
                                                    <div className="modal-form-row">
                                                        <textarea name="additionalDetails.notes" value={reportForm.additionalDetails.notes} onChange={handleReportChange} placeholder="Notas adicionales" rows={1} />
                                                    </div>
                                                    {reportError && <div className="modal-error">{reportError}</div>}
                                                    {reportSuccess && <div className="modal-success">Incidente reportado correctamente</div>}
                                                    <div className="modal-form-actions">
                                                        <button type="submit" className="btn-report-incident-submit" disabled={reportLoading}>
                                                            {reportLoading ? 'Enviando...' : 'Registrar'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                    <div className="incident-panel-search">
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Buscar por tipo, descripción, ubicación o reportado por..."
                                            value={filters.search}
                                            onChange={e => updateFilters({ search: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="incidents-container">
                                        {selectedQuadrant && filterIncidents(incidents.filter(incident => incident.quadrant === selectedQuadrant)).map((incident) => (
                                            <div
                                                key={incident._id}
                                                className="incident-card"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    setSelectedIncident(incident);
                                                    setShowIncidents(false);
                                                }}
                                            >
                                                {editingIncidentId === incident._id ? (
                                                    <form onSubmit={e => { e.preventDefault(); handleSaveIncident(incident._id); }}>
                                                        <div className="incident-header">
                                                            <input className="incident-type-input" value={editForm.crimeType} onChange={e => handleEditChange(e, 'crimeType')} required />
                                                            <select className="incident-impact-input" value={editForm.crimeImpact} onChange={e => handleEditChange(e, 'crimeImpact')} required>
                                                                <option value="ALTO">ALTO</option>
                                                                <option value="BAJO">BAJO</option>
                                                            </select>
                                                        </div>
                                                        <div className="incident-details">
                                                            <label><strong>Ubicación:</strong>
                                                                <input value={editForm.location.street} onChange={e => handleEditChange(e, 'location', 'street')} required />
                                                            </label>
                                                            <label><strong>Lat:</strong>
                                                                <input type="number" step="any" value={editForm.location.lat} onChange={e => handleEditChange(e, 'location', 'lat')} required />
                                                            </label>
                                                            <label><strong>Lng:</strong>
                                                                <input type="number" step="any" value={editForm.location.lng} onChange={e => handleEditChange(e, 'location', 'lng')} required />
                                                            </label>
                                                            <label><strong>Fecha:</strong>
                                                                <input type="date" value={editForm.date?.slice(0, 10)} onChange={e => handleEditChange(e, 'date')} required />
                                                            </label>
                                                            <label><strong>Descripción:</strong>
                                                                <textarea value={editForm.description} onChange={e => handleEditChange(e, 'description')} required />
                                                            </label>
                                                            <label><strong>Reportado por:</strong>
                                                                <input value={editForm.reportedBy} onChange={e => handleEditChange(e, 'reportedBy')} required />
                                                            </label>
                                                        </div>
                                                        <div className="incident-actions">
                                                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    disabled={saving}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        borderRadius: 4,
                                                                        border: '1px solid #dc3545',
                                                                        background: '#fff',
                                                                        color: '#dc3545',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    disabled={saving}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        borderRadius: 4,
                                                                        border: 'none',
                                                                        background: '#2563eb',
                                                                        color: '#fff',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {saving ? 'Guardando...' : 'Guardar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {saveError && <div className="incident-error">{saveError}</div>}
                                                        {saveSuccess && <div className="incident-success">{saveSuccess}</div>}
                                                    </form>
                                                ) : (
                                                    <>
                                                        <div className="incident-header">
                                                            <span className="incident-type">{incident.crimeType}</span>
                                                            <span className={`incident-impact ${incident.crimeImpact ? incident.crimeImpact.toLowerCase() : ''}`}>{incident.crimeImpact || 'N/A'}</span>
                                                        </div>
                                                        <div className="incident-details">
                                                            <p><strong>Ubicación:</strong> {incident.location.street}</p>
                                                            {(() => {
                                                                let lat = '', lng = '';
                                                                const coords = incident.location.coordinates;
                                                                if (coords) {
                                                                    if (Array.isArray(coords)) {
                                                                        lng = coords[0];
                                                                        lat = coords[1];
                                                                        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
                                                                            [lat, lng] = [lng, lat];
                                                                        }
                                                                    } else {
                                                                        lng = coords.lng;
                                                                        lat = coords.lat;
                                                                    }
                                                                }
                                                                return (
                                                                    <>
                                                                        <p><strong>Lat:</strong> {lat || 'N/A'}</p>
                                                                        <p><strong>Lng:</strong> {lng || 'N/A'}</p>
                                                                    </>
                                                                );
                                                            })()}
                                                            <p><strong>Fecha:</strong> {new Date(incident.date).toLocaleDateString()}</p>
                                                            {incident.time && (
                                                                <p><strong>Hora:</strong> {incident.time}</p>
                                                            )}
                                                            {incident.description && (
                                                                <p><strong>Descripción:</strong> {incident.description}</p>
                                                            )}
                                                            <p><strong>Reportado por:</strong> {incident.reportedBy || 'N/A'}</p>
                                                            <p><strong>Estado:</strong> <span className={`incident-status ${incident.status?.toLowerCase().replace(' ', '-')}`}>{incident.status || 'N/A'}</span></p>
                                                        </div>
                                                        <div className="incident-actions">
                                                            {canEdit && editingIncidentId !== incident._id ? (
                                                                <>
                                                                    <button
                                                                        className="popup-button"
                                                                        style={{
                                                                            background: '#dc3545',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            borderRadius: 5,
                                                                            padding: '8px 16px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            fontSize: 14,
                                                                            transition: 'all 0.2s ease'
                                                                        }}
                                                                        onClick={() => {
                                                                            if (window.confirm('¿Estás seguro de que deseas eliminar este incidente? Esta acción no se puede deshacer.')) {
                                                                                handleDeleteIncident(incident._id);
                                                                                setSelectedIncident(null);
                                                                            }
                                                                        }}
                                                                    >
                                                                        Eliminar
                                                                    </button>
                                                                    <button
                                                                        className="popup-button"
                                                                        style={{
                                                                            background: '#2563eb',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            borderRadius: 5,
                                                                            padding: '8px 16px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            fontSize: 14,
                                                                            transition: 'all 0.2s ease'
                                                                        }}
                                                                        onClick={() => handleEditIncident(incident)}
                                                                    >
                                                                        Editar
                                                                    </button>
                                                                </>
                                                            ) : null}
                                                            {!canEdit && (
                                                                <div style={{ color: '#888', fontSize: 14, marginTop: 10 }}>
                                                                    Solo los administradores pueden editar o eliminar incidentes.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {selectedIncident && !showIncidents && (
                            <div className="details-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                    <span style={{ fontSize: 28, color: '#2563eb' }} dangerouslySetInnerHTML={{ __html: getMarkerIcon(selectedIncident).options.html }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 18, color: '#222' }}>{selectedIncident.type || 'Incidente'}</div>
                                        {selectedIncident.crimeType && <div style={{ fontSize: 15, color: '#555' }}>{selectedIncident.crimeType}</div>}
                                    </div>
                                </div>
                                {editingIncidentId === selectedIncident._id ? (
                                    <form onSubmit={e => { e.preventDefault(); handleSaveIncident(selectedIncident._id); }}>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Ubicación:
                                                <input
                                                    value={editForm.location.street}
                                                    onChange={e => handleEditChange(e, 'location', 'street')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Latitud:
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={editForm.location.lat}
                                                    onChange={e => handleEditChange(e, 'location', 'lat')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Longitud:
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={editForm.location.lng}
                                                    onChange={e => handleEditChange(e, 'location', 'lng')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Impacto:
                                                <select
                                                    value={editForm.crimeImpact || ''}
                                                    onChange={e => handleEditChange(e, 'crimeImpact')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                >
                                                    <option value="">Selecciona impacto</option>
                                                    <option value="ALTO">ALTO</option>
                                                    <option value="BAJO">BAJO</option>
                                                </select>
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Fecha:
                                                <input
                                                    type="date"
                                                    value={editForm.date?.slice(0, 10)}
                                                    onChange={e => handleEditChange(e, 'date')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Descripción:
                                                <textarea
                                                    value={editForm.description}
                                                    onChange={e => handleEditChange(e, 'description')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd', minHeight: 80 }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Reportado por:
                                                <input
                                                    value={editForm.reportedBy}
                                                    onChange={e => handleEditChange(e, 'reportedBy')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#444' }}>
                                                Estado:
                                                <select
                                                    value={editForm.status || selectedIncident.status}
                                                    onChange={e => handleEditChange(e, 'status')}
                                                    style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ddd' }}
                                                    required
                                                >
                                                    <option value="reportado">Reportado</option>
                                                    <option value="en investigación">En Investigación</option>
                                                    <option value="resuelto">Resuelto</option>
                                                    <option value="archivado">Archivado</option>
                                                </select>
                                            </label>
                                        </div>
                                        {saveError && <div style={{ color: '#dc3545', marginBottom: 10 }}>{saveError}</div>}
                                        {saveSuccess && <div style={{ color: '#28a745', marginBottom: 10 }}>{saveSuccess}</div>}
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                disabled={saving}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: 4,
                                                    border: '1px solid #dc3545',
                                                    background: '#fff',
                                                    color: '#dc3545',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: 4,
                                                    border: 'none',
                                                    background: '#2563eb',
                                                    color: '#fff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {saving ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="incident-header">
                                            <span className="incident-type">{selectedIncident.crimeType}</span>
                                            <span className={`incident-impact ${selectedIncident.crimeImpact ? selectedIncident.crimeImpact.toLowerCase() : ''}`}>{selectedIncident.crimeImpact || 'N/A'}</span>
                                        </div>
                                        <div className="incident-details">
                                            <p><strong>Ubicación:</strong> {selectedIncident.location.street}</p>
                                            {(() => {
                                                let lat = '', lng = '';
                                                const coords = selectedIncident.location.coordinates;
                                                if (coords) {
                                                    if (Array.isArray(coords)) {
                                                        lng = coords[0];
                                                        lat = coords[1];
                                                        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
                                                            [lat, lng] = [lng, lat];
                                                        }
                                                    } else {
                                                        lng = coords.lng;
                                                        lat = coords.lat;
                                                    }
                                                }
                                                return (
                                                    <>
                                                        <p><strong>Lat:</strong> {lat || 'N/A'}</p>
                                                        <p><strong>Lng:</strong> {lng || 'N/A'}</p>
                                                    </>
                                                );
                                            })()}
                                            <p><strong>Fecha:</strong> {new Date(selectedIncident.date).toLocaleDateString()}</p>
                                            {selectedIncident.time && (
                                                <p><strong>Hora:</strong> {selectedIncident.time}</p>
                                            )}
                                            {selectedIncident.description && (
                                                <p><strong>Descripción:</strong> {selectedIncident.description}</p>
                                            )}
                                            <p><strong>Reportado por:</strong> {selectedIncident.reportedBy || 'N/A'}</p>
                                            <p><strong>Estado:</strong> <span className={`incident-status ${selectedIncident.status?.toLowerCase().replace(' ', '-')}`}>{selectedIncident.status || 'N/A'}</span></p>
                                        </div>
                                        <div className="incident-actions">
                                            {canEdit && editingIncidentId !== selectedIncident._id ? (
                                                <>
                                                    <button
                                                        className="popup-button"
                                                        style={{
                                                            background: '#dc3545',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 5,
                                                            padding: '8px 16px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            fontSize: 14,
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onClick={() => {
                                                            if (window.confirm('¿Estás seguro de que deseas eliminar este incidente? Esta acción no se puede deshacer.')) {
                                                                handleDeleteIncident(selectedIncident._id);
                                                                setSelectedIncident(null);
                                                            }
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                    <button
                                                        className="popup-button"
                                                        style={{
                                                            background: '#2563eb',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 5,
                                                            padding: '8px 16px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            fontSize: 14,
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onClick={() => handleEditIncident(selectedIncident)}
                                                    >
                                                        Editar
                                                    </button>
                                                </>
                                            ) : null}
                                            {!canEdit && (
                                                <div style={{ color: '#888', fontSize: 14, marginTop: 10 }}>
                                                    Solo los administradores pueden editar o eliminar incidentes.
                                                </div>
                                            )}
                                            <button
                                                className="popup-button"
                                                style={{
                                                    background: '#adb5bd',
                                                    color: '#222',
                                                    border: 'none',
                                                    borderRadius: 5,
                                                    padding: '8px 16px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: 14,
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() => setSelectedIncident(null)}
                                            >
                                                Cerrar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Map;