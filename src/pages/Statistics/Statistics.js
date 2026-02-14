import React, { useState, useEffect } from 'react';
import './Statistics.css';
import { getIncidents } from '../../services/incidents';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FaChartBar, FaExclamationTriangle } from 'react-icons/fa';
import * as turf from '@turf/turf';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as XLSX from 'xlsx';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    ChartDataLabels,
    Filler
);

const IMPACT_TYPES = ['ALTO', 'BAJO'];
const STATUS_TYPES = ['reportado', 'en investigación', 'resuelto', 'archivado'];

// --- Tipos de delito y nivel de impacto ---
const DELITOS_ALTO_IMPACTO = [
    'Homicidio',
    'Feminicidio',
    'Secuestro',
    'Extorsión',
    'Robo con violencia',
    'Robo de vehículo con violencia',
    'Robo a casa habitación con violencia',
    'Robo a negocio con violencia',
    'Violación',
    'Trata de personas',
    'Robo a transeunte en la vía pública con violencia',
    'Lesiones dolosas por disparo de arma de fuego',
    'Robo a transeunte en la vía pública sin violencia',
    'Robo a pasajero a bordo de metro con violencia',
    'Robo a repartidor con y sin violencia',
    'Robo a pasajero a bordo de taxi con violencia',
    'Robo a transportista con o sin violencia',
    'Robo a pasajero a bordo de microbús con y sin violencia',
    'Daño a propiedad culposo',
    'Despojo',
    'Allanamiento de domicilio'
];
const DELITOS_BAJO_IMPACTO = [
    'Robo sin violencia',
    'Robo de vehículo sin violencia',
    'Robo a casa habitación sin violencia',
    'Robo a negocio sin violencia',
    'Acoso en la vía pública',
    'Fraude',
    'Falsificación de documentos',
    'Lesiones menores (sin hospitalización)',
    'Quejas por ruido',
    'Vandalismo',
    'Violencia familiar',
    'Posesión de drogas para consumo personal',
    'Amenazas',
    'Robo a pasajero a bordo de metro sin violencia',
    'Robo de autopartes',
    'Otro'
];

const quadrantColors = [
    '#1f77b4', // Azul oscuro
    '#ff7f0e', // Naranja
    '#2ca02c', // Verde
    '#d62728', // Rojo
    '#9467bd', // Púrpura
    '#8c564b', // Marrón
    '#e377c2', // Rosa
    '#7f7f7f', // Gris
    '#bcbd22', // Verde oliva
    '#17becf', // Cian
    '#ff9896', // Rosa claro
    '#98df8a'  // Verde claro
];

const Statistics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        type: 'all',
        impact: 'all',
        status: 'all'
    });
    const [quadrantFilters, setQuadrantFilters] = useState({
        from: '',
        to: '',
        type: 'all',
        impact: 'all',
        status: 'all'
    });
    const [groupBy, setGroupBy] = useState('dia'); // 'dia', 'semana', 'mes'
    const [quadrantsGeoJSON, setQuadrantsGeoJSON] = useState(null);
    const [impactFilter, setImpactFilter] = useState('all'); // 'all', 'ALTO', 'BAJO'
    const [selectedQuadrant, setSelectedQuadrant] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [delitoTipo, setDelitoTipo] = useState('all');
    const [quadrantDelitoTipo, setQuadrantDelitoTipo] = useState('all');
    const [visibleQuadrants, setVisibleQuadrants] = useState(Array(12).fill(true));
    const [visibleQuadrantsBar, setVisibleQuadrantsBar] = useState(Array(12).fill(true));
    const [isMobile, setIsMobile] = useState(false);
    const [dateRangeInfo, setDateRangeInfo] = useState({
        start: null,
        end: null,
        oldestAvailable: null
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getIncidents();
                // Ordenar incidentes por fecha (exactamente igual que Map.jsx)
                const sortedIncidents = data.data.sort((a, b) => new Date(b.date) - new Date(a.date));

                // Encontrar la fecha más antigua y más reciente (sin ajuste de zona horaria, igual que Map.jsx)
                const oldestDate = new Date(Math.min(...sortedIncidents.map(inc => new Date(inc.date))));
                const newestDate = new Date(Math.max(...sortedIncidents.map(inc => new Date(inc.date))));

                // Calcular la fecha de inicio para los últimos 30 días (igual que Map.jsx)
                const thirtyDaysAgo = new Date(newestDate);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                setDateRangeInfo({
                    start: thirtyDaysAgo,
                    end: newestDate,
                    oldestAvailable: oldestDate
                });

                setStats({ incidents: sortedIncidents });
                setLoading(false);
            } catch (err) {
                setError('Error al cargar las estadísticas');
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        // Cargar el GeoJSON de cuadrantes solo una vez
        fetch('/data/tlatelolco_quadrants.geojson')
            .then(res => res.json())
            .then(data => setQuadrantsGeoJSON(data));
    }, []);

    useEffect(() => {
        if (!stats || !stats.incidents) return;
    }, [stats]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 430);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- Funciones utilitarias ---
    // Función para obtener fecha en zona horaria local con ajuste de zona horaria (igual que Map.jsx)
    function getAdjustedDate(dateInput) {
        const d = new Date(dateInput);
        // Aplicar el mismo ajuste de zona horaria que en Map.jsx (-6 horas)
        d.setHours(d.getHours() - 6);
        return d;
    }
    // Función para obtener fecha local en formato YYYY-MM-DD
    function getLocalDateString(dateInput) {
        const d = getAdjustedDate(dateInput);
        if (!d) return '';
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }
    // Función para obtener mes local en formato YYYY-MM
    function getLocalMonthString(dateInput) {
        const d = getAdjustedDate(dateInput);
        if (!d) return '';
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${y}-${m}`;
    }
    // Para semana local
    function getWeekNumberLocal(dateInput) {
        const d = getAdjustedDate(dateInput);
        if (!d) return '';
        const dayNum = d.getDay() || 7;
        d.setDate(d.getDate() + 4 - dayNum);
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Función auxiliar para verificar si un incidente está en el rango de fechas (igual que Map.jsx)
    const isIncidentInRange = (incidentDate, fromDate, toDate) => {
        const date = new Date(incidentDate);
        date.setHours(date.getHours() - 6); // Mismo ajuste que Map.jsx

        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            if (date < from) return false;
        }

        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (date > to) return false;
        }

        return true;
    };

    // Agrupar por día y por impacto para barras apiladas
    const groupByDayImpact = (incidents) => {
        const map = {};
        incidents.forEach(i => {
            try {
                const date = getAdjustedDate(i.date);
                if (isNaN(date.getTime())) return;
                const day = getLocalDateString(date); // LOCAL
                if (!map[day]) map[day] = { ALTO: 0, BAJO: 0 };
                if (i.crimeImpact === 'ALTO') map[day].ALTO++;
                else if (i.crimeImpact === 'BAJO') map[day].BAJO++;
            } catch (error) { console.error(error); }
        });
        return map;
    };

    // Agrupar por día
    const groupByDay = (incidents) => {
        const map = {};
        incidents.forEach(i => {
            try {
                const date = getAdjustedDate(i.date);
                if (isNaN(date.getTime())) {
                    return;
                }
                const day = getLocalDateString(date);
                map[day] = (map[day] || 0) + 1;
            } catch (error) { console.error(error); }
        });
        return map;
    };

    // Agrupar por impacto
    const groupByImpact = (incidents) => {
        const map = { ALTO: 0, BAJO: 0 };
        incidents.forEach(i => {
            if (i.crimeImpact === 'ALTO') map.ALTO++;
            else if (i.crimeImpact === 'BAJO') map.BAJO++;
        });
        return map;
    };

    // Agrupar por período para gráficas generales
    const groupByPeriod = (incidents, period) => {
        const map = {};
        incidents.forEach(i => {
            let key = '';
            if (!i.date) {
                key = 'Sin fecha';
            } else {
                const date = getAdjustedDate(i.date);
                if (isNaN(date.getTime())) {
                    key = 'Sin fecha';
                } else if (period === 'dia') {
                    key = getLocalDateString(date);
                } else if (period === 'semana') {
                    const year = date.getFullYear();
                    const week = getWeekNumberLocal(date);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                } else if (period === 'mes') {
                    key = getLocalMonthString(date);
                }
            }
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    };

    // Agrupar por período e impacto para gráficas generales
    const groupByPeriodImpact = (incidents, period) => {
        const map = {};
        incidents.forEach(i => {
            let key = '';
            if (!i.date) {
                key = 'Sin fecha';
            } else {
                const date = getAdjustedDate(i.date);
                if (isNaN(date.getTime())) {
                    key = 'Sin fecha';
                } else if (period === 'dia') {
                    key = getLocalDateString(date);
                } else if (period === 'semana') {
                    const year = date.getFullYear();
                    const week = getWeekNumberLocal(date);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                } else if (period === 'mes') {
                    key = getLocalMonthString(date);
                }
            }
            if (!map[key]) map[key] = { ALTO: 0, BAJO: 0 };
            if (i.crimeImpact === 'ALTO') map[key].ALTO++;
            else if (i.crimeImpact === 'BAJO') map[key].BAJO++;
        });
        return map;
    };

    // Procesar incidentes para asegurar que todos tengan cuadrante usando turf y el GeoJSON
    const processedIncidents = (stats?.incidents || []).map(i => {
        let lat, lng;
        const coords = i.location?.coordinates;
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
        let quadrant = null;
        if (quadrantsGeoJSON && typeof lat === 'number' && typeof lng === 'number') {
            const point = turf.point([lng, lat]);
            for (const feature of quadrantsGeoJSON.features) {
                if (turf.booleanPointInPolygon(point, feature)) {
                    quadrant = feature.properties.no_cdrn;
                    break;
                }
            }
        }
        if (quadrant && quadrant >= 1 && quadrant <= 12) {
            return { ...i, quadrant };
        } else {
            return { ...i, quadrant: null };
        }
    });

    // Filtrado normal para las primeras 2 gráficas (Incidentes por Día y Tendencia Semanal)
    const filtered = processedIncidents.filter(i => {
        let pass = true;

        // Filtro por rango de fechas usando la función auxiliar
        if (filters.from || filters.to) {
            if (!isIncidentInRange(i.date, filters.from, filters.to)) {
                return false;
            }
        }

        if (filters.type !== 'all') {
            pass = pass && i.type === filters.type;
        }
        if (filters.impact !== 'all') {
            pass = pass && i.crimeImpact === filters.impact;
        }
        if (filters.status !== 'all') {
            pass = pass && i.status === filters.status;
        }
        if (delitoTipo !== 'all') {
            pass = pass && i.crimeType === delitoTipo;
        }

        // Si no hay filtros de fecha específicos, mostrar solo los últimos 30 días
        if (!filters.from && !filters.to) {
            const incidentDate = new Date(i.date); // Sin ajuste de zona horaria, igual que Map.jsx
            const thirtyDaysAgo = new Date(dateRangeInfo.end);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (incidentDate < thirtyDaysAgo) return false;
        }

        return pass;
    });

    // Filtrado para las gráficas de cuadrantes usando quadrantFilters
    const filteredForQuadrants = processedIncidents.filter(i => {
        let pass = true;

        // Filtro por rango de fechas usando la función auxiliar
        if (quadrantFilters.from || quadrantFilters.to) {
            if (!isIncidentInRange(i.date, quadrantFilters.from, quadrantFilters.to)) {
                return false;
            }
        }

        if (quadrantFilters.type !== 'all') {
            pass = pass && i.type === quadrantFilters.type;
        }
        if (quadrantFilters.impact !== 'all') {
            pass = pass && i.crimeImpact === quadrantFilters.impact;
        }
        if (quadrantFilters.status !== 'all') {
            pass = pass && i.status === quadrantFilters.status;
        }
        if (quadrantDelitoTipo !== 'all') {
            pass = pass && i.crimeType === quadrantDelitoTipo;
        }

        // Si no hay filtros de fecha específicos, mostrar solo los últimos 30 días
        if (!quadrantFilters.from && !quadrantFilters.to) {
            const incidentDate = new Date(i.date); // Sin ajuste de zona horaria, igual que Map.jsx
            const thirtyDaysAgo = new Date(dateRangeInfo.end);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (incidentDate < thirtyDaysAgo) return false;
        }

        return pass;
    });

    // Usar filtered para todas las gráficas normales
    const dayImpactMap = groupByDayImpact(filtered);
    const dayMap = groupByDay(filtered);
    const impactMap = groupByImpact(filtered);

    // Agrupar por período para gráficas generales
    const periodMap = groupByPeriod(filtered, groupBy);
    const periodImpactMap = groupByPeriodImpact(filtered, groupBy);

    // --- Generar labels de fechas completas para el rango seleccionado ---
    let minDate = null, maxDate = null;
    const allFiltered = [...filtered];
    if (allFiltered.length > 0) {
        minDate = allFiltered.reduce((min, i) => getAdjustedDate(i.date) < getAdjustedDate(min.date) ? i : min).date;
        maxDate = allFiltered.reduce((max, i) => getAdjustedDate(i.date) > getAdjustedDate(max.date) ? i : max).date;
    }
    const rangeFrom = minDate ? getLocalDateString(minDate) : null;
    const rangeTo = maxDate ? getLocalDateString(maxDate) : null;
    let dayLabels = [];
    if (rangeFrom && rangeTo) {
        dayLabels = getDateRangeArray(rangeFrom, rangeTo);
    }

    // --- Generar labels de fechas para cuadrantes basados en filteredForQuadrants ---
    let quadrantMinDate = null, quadrantMaxDate = null;
    const allFilteredQuadrants = [...filteredForQuadrants];
    if (allFilteredQuadrants.length > 0) {
        quadrantMinDate = allFilteredQuadrants.reduce((min, i) => getAdjustedDate(i.date) < getAdjustedDate(min.date) ? i : min).date;
        quadrantMaxDate = allFilteredQuadrants.reduce((max, i) => getAdjustedDate(i.date) > getAdjustedDate(max.date) ? i : max).date;
    }
    const quadrantRangeFrom = quadrantMinDate ? getLocalDateString(quadrantMinDate) : null;
    const quadrantRangeTo = quadrantMaxDate ? getLocalDateString(quadrantMaxDate) : null;
    let quadrantDayLabels = [];
    if (quadrantRangeFrom && quadrantRangeTo) {
        quadrantDayLabels = getDateRangeArray(quadrantRangeFrom, quadrantRangeTo);
    }

    const allQuadrants = Array.from({ length: 12 }, (_, i) => i + 1);
    const allPeriods = delitoTipo !== 'all' ? getAllPeriods(filtered, groupBy) : getAllPeriods(filtered, groupBy);
    const allPeriodsQuadrants = quadrantDelitoTipo !== 'all' ? getAllPeriods(filteredForQuadrants, groupBy) : getAllPeriods(filteredForQuadrants, groupBy);
    let periodLabels = allPeriods;
    let periodLabelsQuadrants = allPeriodsQuadrants;

    if (groupBy === 'dia' && filters.from && filters.to) {
        periodLabels = delitoTipo !== 'all' ? dayLabels : dayLabels;
    } else if (groupBy === 'semana') {
        periodLabels = allPeriods.map(w => {
            if (/^\d{4}-W\d{2}$/.test(w)) {
                const [year, weekStr] = w.split('-W');
                return getWeekDateRange(Number(year), Number(weekStr));
            }
            return w;
        });
    } else if (groupBy === 'dia' && (filters.from || filters.to)) {
        // Si solo hay un filtro de fecha (from o to), usar el rango de fechas de los datos filtrados
        periodLabels = dayLabels;
    }

    if (groupBy === 'dia' && quadrantFilters.from && quadrantFilters.to) {
        periodLabelsQuadrants = quadrantDelitoTipo !== 'all' ? quadrantDayLabels : quadrantDayLabels;
    } else if (groupBy === 'semana') {
        periodLabelsQuadrants = allPeriodsQuadrants.map(w => {
            if (/^\d{4}-W\d{2}$/.test(w)) {
                const [year, weekStr] = w.split('-W');
                return getWeekDateRange(Number(year), Number(weekStr));
            }
            return w;
        });
    } else if (groupBy === 'dia' && (quadrantFilters.from || quadrantFilters.to)) {
        // Si solo hay un filtro de fecha (from o to), usar el rango de fechas de los datos filtrados
        periodLabelsQuadrants = quadrantDayLabels;
    }

    // --- Responsive: solo mostrar la última semana en móviles (<=600px) ---
    let dayLabelsToShow = dayLabels;
    let quadrantDayLabelsToShow = quadrantDayLabels;
    let periodLabelsToShow = periodLabels;
    let periodLabelsQuadrantsToShow = periodLabelsQuadrants;
    let allPeriodsToShow = allPeriods;
    let allPeriodsQuadrantsToShow = allPeriodsQuadrants;

    if (isMobile && dayLabels.length > 7) {
        dayLabelsToShow = dayLabels.slice(-7);
    }
    if (isMobile && quadrantDayLabels.length > 7) {
        quadrantDayLabelsToShow = quadrantDayLabels.slice(-7);
    }
    if (isMobile && periodLabels.length > 7 && groupBy === 'dia') {
        periodLabelsToShow = periodLabels.slice(-7);
        allPeriodsToShow = allPeriods.slice(-7);
    }
    if (isMobile && periodLabelsQuadrants.length > 7 && groupBy === 'dia') {
        periodLabelsQuadrantsToShow = periodLabelsQuadrants.slice(-7);
        allPeriodsQuadrantsToShow = allPeriodsQuadrants.slice(-7);
    }

    // Gráfica de barras: incidentes por día (solo cuadrantes válidos)
    const dayAltoData = dayLabelsToShow.map(label => dayImpactMap[label]?.ALTO || 0);
    const dayBajoData = dayLabelsToShow.map(label => dayImpactMap[label]?.BAJO || 0);

    // Datos por período para gráficas generales
    const periodAltoData = periodLabelsToShow.map(label => periodImpactMap[label]?.ALTO || 0);
    const periodBajoData = periodLabelsToShow.map(label => periodImpactMap[label]?.BAJO || 0);
    const periodData = periodLabelsToShow.map(label => periodMap[label] || 0);

    const barData = {
        labels: groupBy === 'dia' ? dayLabelsToShow : periodLabelsToShow,
        datasets: [
            {
                label: 'Alto Impacto',
                data: groupBy === 'dia' ? dayAltoData : periodAltoData,
                backgroundColor: '#F44336',
                stack: 'impact',
            },
            {
                label: 'Bajo Impacto',
                data: groupBy === 'dia' ? dayBajoData : periodBajoData,
                backgroundColor: '#FFC107',
                stack: 'impact',
            },
        ],
    };

    // Tarjetas de resumen (solo cuadrantes válidos)
    const total = filtered.length;
    const totalAlto = impactMap.ALTO;
    const totalBajo = impactMap.BAJO;

    // --- Tendencia diaria (linea) ---
    const dayData = dayLabelsToShow.map(label => dayMap[label] || 0);
    const lineData = {
        labels: groupBy === 'dia' ? dayLabelsToShow : periodLabelsToShow,
        datasets: [
            {
                label: groupBy === 'dia' ? 'Tendencia Diaria' : groupBy === 'semana' ? 'Tendencia Semanal' : 'Tendencia Mensual',
                data: groupBy === 'dia' ? dayData : periodData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                tension: 0.3,
                fill: true,
            },
        ],
    };

    // Agrupar por periodo y cuadrante
    const groupByPeriodQuadrant = (incidents, period) => {
        const map = {};
        incidents.forEach(i => {
            if (!Number.isInteger(i.quadrant) || i.quadrant < 1 || i.quadrant > 12) return;
            let key = '';
            if (!i.date) {
                key = 'Sin fecha';
            } else {
                const date = getAdjustedDate(i.date);
                if (isNaN(date.getTime())) {
                    key = 'Sin fecha';
                } else if (period === 'dia') {
                    key = getLocalDateString(date);
                } else if (period === 'semana') {
                    const year = date.getFullYear();
                    const week = getWeekNumberLocal(date);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                } else if (period === 'mes') {
                    key = getLocalMonthString(date);
                }
            }
            if (!map[i.quadrant]) map[i.quadrant] = {};
            map[i.quadrant][key] = (map[i.quadrant][key] || 0) + 1;
        });
        return map;
    };

    // --- Modifica getAllPeriods para incluir 'Sin fecha' si existe en los datos
    function getAllPeriods(incidents, period) {
        if (incidents.length === 0) return [];
        let getKey;
        if (period === 'dia') {
            getKey = d => d ? getLocalDateString(d) : 'Sin fecha';
        } else if (period === 'semana') {
            getKey = d => {
                if (!d) return 'Sin fecha';
                const year = d.getFullYear();
                const week = getWeekNumberLocal(d);
                return `${year}-W${week.toString().padStart(2, '0')}`;
            };
        } else if (period === 'mes') {
            getKey = d => d ? getLocalMonthString(d) : 'Sin fecha';
        }
        const dates = incidents.map(i => i.date ? getAdjustedDate(i.date) : null).filter(d => d === null || !isNaN(d.getTime())).sort((a, b) => {
            if (a === null) return 1;
            if (b === null) return -1;
            return a - b;
        });
        const start = dates.find(d => d !== null);
        const end = dates.length > 0 ? dates[dates.length - 1] : null;
        const all = [];
        if (start && end) {
            let current = new Date(start);
            while (current <= end) {
                all.push(getKey(current));
                if (period === 'dia') current.setDate(current.getDate() + 1);
                else if (period === 'semana') current.setDate(current.getDate() + 7);
                else if (period === 'mes') current.setMonth(current.getMonth() + 1);
            }
        }
        // Agrega 'Sin fecha' si hay incidentes sin fecha
        if (incidents.some(i => !i.date || isNaN(new Date(i.date).getTime()))) {
            all.push('Sin fecha');
        }
        return Array.from(new Set(all));
    }

    const periodQuadrantMap = groupByPeriodQuadrant(filteredForQuadrants, groupBy);

    // --- Utilidad para obtener el rango de fechas de una semana ---
    function getWeekDateRange(year, week) {
        // Set to the first day of the year
        const d = new Date(year, 0, 1);
        // Get the day of week (0: Sunday, 1: Monday, ...)
        const day = d.getDay() || 7;
        // Move to the first Monday of the year
        d.setDate(d.getDate() + (1 - day) + (week - 1) * 7);
        const start = new Date(d);
        const end = new Date(d);
        end.setDate(start.getDate() + 6);
        // Format as '7-13 Abr'
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
        const endStr = `${end.getDate()} ${months[end.getMonth()]}`;
        return `${startStr} - ${endStr}`;
    }

    // --- Para la gráfica de líneas de cuadrantes, también usar periodLabels ---
    const periodQuadrantLineData = {
        labels: groupBy === 'dia' ? quadrantDayLabelsToShow : periodLabelsQuadrantsToShow,
        datasets: allQuadrants.map((q, idx) => ({
            label: `Cuadrante ${q}`,
            data: (groupBy === 'dia' ? quadrantDayLabelsToShow : periodLabelsQuadrantsToShow).map((m, i) => {
                // Para semana, usar el valor original de allPeriodsQuadrants
                const periodKey = groupBy === 'semana' ? allPeriodsQuadrantsToShow[i] : m;
                return periodQuadrantMap[q]?.[periodKey] || 0;
            }),
            borderColor: quadrantColors[idx % quadrantColors.length],
            backgroundColor: quadrantColors[idx % quadrantColors.length] + '33',
            tension: 0.3,
            fill: false,
            hidden: false
        }))
    };

    // Generar arreglo de fechas entre dos fechas (inclusive)
    function getDateRangeArray(from, to) {
        const result = [];
        let current = new Date(from);
        const end = new Date(to);
        while (current <= end) {
            result.push(getLocalDateString(current));
            current.setDate(current.getDate() + 1);
        }
        return result;
    }

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
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="alert alert-info" role="alert">
                No hay datos de estadísticas disponibles.
            </div>
        );
    }

    return (
        <div className="statistics-container">
            <h2 className={isMobile ? 'statistics-title-mobile' : ''}>Estadísticas de Incidentes en Tlatelolco</h2>

            {/* Leyenda de fechas */}
            <div className="date-range-info" style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#f8fafc',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    color: '#1e293b'
                }}>
                    <span style={{ fontWeight: '600' }}>Últimos 30 días:</span>
                    <span>{dateRangeInfo.start?.toLocaleDateString('es-MX')} - {dateRangeInfo.end?.toLocaleDateString('es-MX')}</span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#f8fafc',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    color: '#1e293b'
                }}>
                    <span style={{ fontWeight: '600' }}>Datos disponibles desde:</span>
                    <span>{dateRangeInfo.oldestAvailable?.toLocaleDateString('es-MX')}</span>
                </div>
            </div>

            {/* Filtros globales */}
            <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '16px',
                padding: '2rem',
                margin: '2rem 0',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <h3 style={{
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    color: '#174ea6',
                    fontWeight: '700',
                    fontSize: '1.5rem',
                    fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                }}>
                    Filtros para Gráficas Generales
                </h3>
                <div className={isMobile ? "stats-filters-mobile" : "stats-filters"}>
                    <div className="stats-filter-item-mobile">
                        <label>Desde</label>
                        <input type="date" className="date-filter-black stats-date-input form-control" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Hasta</label>
                        <input type="date" className="date-filter-black stats-date-input form-control" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Impacto</label>
                        <select className="form-control" value={filters.impact} onChange={e => setFilters(f => ({ ...f, impact: e.target.value }))}>
                            <option value="all">Todos</option>
                            {IMPACT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Estado</label>
                        <select className="form-control" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="all">Todos</option>
                            {STATUS_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Tipo de delito</label>
                        <select className="form-control" value={delitoTipo} onChange={e => setDelitoTipo(e.target.value)}>
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
                </div>
            </div>
            {/* Tarjetas de resumen */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h4><FaChartBar />Total de Incidentes</h4>
                    <p className="stat-number">{total}</p>
                </div>
                <div className="stat-card">
                    <h4><FaExclamationTriangle style={{ color: '#ef4444' }} />Alto Impacto</h4>
                    <p className="stat-number high-impact">{totalAlto}</p>
                </div>
                <div className="stat-card">
                    <h4><FaExclamationTriangle style={{ color: '#f59e0b' }} />Bajo Impacto</h4>
                    <p className="stat-number low-impact">{totalBajo}</p>
                </div>
            </div>
            {/* Gráficas */}
            <div className="row mb-4">
                <div className="col-md-6 mb-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">
                                {groupBy === 'dia' ? 'Incidentes por Día' : groupBy === 'semana' ? 'Incidentes por Semana' : 'Incidentes por Mes'}
                            </h5>
                            <Bar data={barData} options={{
                                responsive: true,
                                plugins: {
                                    legend: { position: 'top' },
                                    title: { display: false },
                                    datalabels: {
                                        color: '#222',
                                        font: { weight: 'bold', size: 12 },
                                        display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                                        formatter: v => v > 0 ? v : '',
                                    }
                                },
                                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }
                            }} plugins={[ChartDataLabels]} />
                        </div>
                    </div>
                </div>
                <div className="col-md-6 mb-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">
                                {groupBy === 'dia' ? 'Tendencia Diaria' : groupBy === 'semana' ? 'Tendencia Semanal' : 'Tendencia Mensual'}
                            </h5>
                            <Line data={lineData} options={{
                                responsive: true,
                                plugins: {
                                    legend: { display: false },
                                    title: { display: false },
                                    datalabels: {
                                        color: '#222',
                                        font: { weight: 'bold', size: 13 },
                                        display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                                        formatter: v => v > 0 ? v : '',
                                        anchor: 'end',
                                        align: 'top',
                                    },
                                },
                                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                            }} plugins={[ChartDataLabels]} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Segunda sección de filtros para análisis de cuadrantes */}
            <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '16px',
                padding: '2rem',
                margin: '2rem 0',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <h3 style={{
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    color: '#174ea6',
                    fontWeight: '700',
                    fontSize: '1.5rem',
                    fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                }}>
                    Filtros para Análisis de Cuadrantes
                </h3>
                <div className={isMobile ? "stats-filters-mobile" : "stats-filters"}>
                    <div className="stats-filter-item-mobile">
                        <label>Desde</label>
                        <input type="date" className="date-filter-black stats-date-input form-control" value={quadrantFilters.from} onChange={e => setQuadrantFilters(f => ({ ...f, from: e.target.value }))} />
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Hasta</label>
                        <input type="date" className="date-filter-black stats-date-input form-control" value={quadrantFilters.to} onChange={e => setQuadrantFilters(f => ({ ...f, to: e.target.value }))} />
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Impacto</label>
                        <select className="form-control" value={quadrantFilters.impact} onChange={e => setQuadrantFilters(f => ({ ...f, impact: e.target.value }))}>
                            <option value="all">Todos</option>
                            {IMPACT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Estado</label>
                        <select className="form-control" value={quadrantFilters.status} onChange={e => setQuadrantFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="all">Todos</option>
                            {STATUS_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="stats-filter-item-mobile">
                        <label>Tipo de delito</label>
                        <select className="form-control" value={quadrantDelitoTipo} onChange={e => setQuadrantDelitoTipo(e.target.value)}>
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
                </div>
            </div>

            <div className="row mb-4 analysis-section">
                <div className="col-12 mb-4 analysis-chart-row">
                    <div className="card h-100" style={{
                        minHeight: 600,
                        boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
                        borderRadius: 22,
                        border: '1.5px solid #e0e8f0',
                        background: '#fff'
                    }}>
                        {/* Título estético */}
                        <div style={{
                            textAlign: 'center',
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            paddingTop: '2.5rem',
                            marginBottom: '2rem',
                            fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                        }}>
                            <h3 style={{
                                fontSize: '2rem',
                                fontWeight: '800',
                                letterSpacing: '-1px',
                                marginBottom: '0.5rem',
                                background: 'none',
                                color: '#174ea6',
                                fontFamily: 'inherit',
                                display: 'inline-block',
                                lineHeight: 1.1,
                                position: 'relative'
                            }}>
                                <span style={{
                                    background: 'linear-gradient(90deg, #174ea6, #2563eb 60%, #60a5fa)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    MozBackgroundClip: 'text',
                                    MozTextFillColor: 'transparent',
                                    color: '#174ea6',
                                    display: 'inline',
                                }}>
                                    Distribución Temporal de Incidentes Apilados por Cuadrante
                                </span>
                            </h3>
                        </div>
                        {/* Filtros de periodo e impacto */}
                        <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 mb-3" style={{ marginBottom: 28, gap: 18, padding: '0.5rem 0', flexWrap: 'wrap' }}>
                            <div className="d-flex align-items-center gap-2" style={{ background: '#f6f8fa', borderRadius: 8, padding: '0.2rem 0.7rem', border: '1px solid #e5e7eb' }}>
                                <label style={{ color: '#174ea6', fontWeight: 700, fontSize: 13, margin: 0, whiteSpace: 'nowrap' }}>Periodo:</label>
                                <select
                                    value={groupBy}
                                    onChange={e => setGroupBy(e.target.value)}
                                    className="form-control"
                                    style={{ width: 100, fontSize: 13, padding: '0.15rem 0.1rem', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', color: '#174ea6', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
                                >
                                    <option value="dia">Por Día</option>
                                    <option value="semana">Por Semana</option>
                                    <option value="mes">Por Mes</option>
                                </select>
                            </div>
                            <div className="d-flex align-items-center gap-2" style={{ background: '#f6f8fa', borderRadius: 8, padding: '0.2rem 0.7rem', border: '1px solid #e5e7eb' }}>
                                <label style={{ color: '#174ea6', fontWeight: 700, fontSize: 13, margin: 0, whiteSpace: 'nowrap' }}>Impacto:</label>
                                <select
                                    value={impactFilter}
                                    onChange={e => setImpactFilter(e.target.value)}
                                    className="form-control"
                                    style={{ width: 100, fontSize: 13, padding: '0.15rem 0.3rem', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', color: '#174ea6', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
                                >
                                    <option value="all">Todos</option>
                                    <option value="ALTO">Alto Impacto</option>
                                    <option value="BAJO">Bajo Impacto</option>
                                </select>
                            </div>
                        </div>
                        {/* Leyenda personalizada de cuadrantes (ahora arriba, interactiva) para la gráfica de barras apiladas */}
                        <div className="custom-quadrant-legend" style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '1.3rem',
                            margin: '0 0 28px 0',
                            padding: '0.7rem 0',
                            fontFamily: 'inherit',
                            fontSize: 16,
                            rowGap: '1rem',
                        }}>
                            {allQuadrants.map((q, idx) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                        setVisibleQuadrantsBar(v => {
                                            const copy = [...v];
                                            copy[idx] = !copy[idx];
                                            return copy;
                                        });
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 9,
                                        minWidth: 120,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        opacity: visibleQuadrantsBar[idx] ? 1 : 0.4,
                                        outline: 'none',
                                        transition: 'opacity 0.2s',
                                        padding: 0,
                                        fontSize: 15,
                                    }}
                                    aria-pressed={visibleQuadrantsBar[idx]}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: quadrantColors[idx % quadrantColors.length],
                                        marginRight: 7,
                                        border: visibleQuadrantsBar[idx] ? '2px solid #e5e7eb' : '2px solid #cbd5e1',
                                        filter: visibleQuadrantsBar[idx] ? 'none' : 'grayscale(0.7) brightness(1.2)',
                                    }}></span>
                                    <span style={{ color: '#174ea6', fontWeight: 700 }}>{`Cuadrante ${q}`}</span>
                                </button>
                            ))}
                        </div>
                        <div className="card-body" style={{ padding: '2.5rem 2.5rem 1.5rem 2.5rem', height: 420, minHeight: 320, maxHeight: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 18 }}>
                            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minWidth: 0, width: '100%', height: 400, maxHeight: 480, paddingTop: '0.5rem', overflowX: 'auto' }}>
                                <Bar
                                    data={{
                                        labels: groupBy === 'dia' ? quadrantDayLabelsToShow : periodLabelsToShow,
                                        datasets: allQuadrants.map((q, idx) =>
                                            visibleQuadrantsBar[idx] ? {
                                                label: `Cuadrante ${q}`,
                                                data: (groupBy === 'dia' ? quadrantDayLabelsToShow : periodLabelsToShow).map((periodLabel, i) => {
                                                    // Filtrar por impacto y periodo
                                                    // Para semana, usar el valor original de allPeriodsQuadrants
                                                    const periodKey = groupBy === 'semana' ? allPeriodsToShow[i] : periodLabel;
                                                    return filteredForQuadrants.filter(i => {
                                                        if (i.quadrant !== q) return false;
                                                        if (impactFilter !== 'all' && i.crimeImpact !== impactFilter) return false;
                                                        // Homologar periodo
                                                        let k = '';
                                                        if (!i.date) return false;
                                                        const date = getAdjustedDate(i.date);
                                                        if (isNaN(date.getTime())) return false;
                                                        if (groupBy === 'dia') k = getLocalDateString(date);
                                                        else if (groupBy === 'semana') {
                                                            const year = date.getFullYear();
                                                            const week = getWeekNumberLocal(date);
                                                            k = `${year}-W${week.toString().padStart(2, '0')}`;
                                                        } else if (groupBy === 'mes') k = getLocalMonthString(date);
                                                        return k === periodKey;
                                                    }).length;
                                                }),
                                                backgroundColor: quadrantColors[idx % quadrantColors.length],
                                                borderRadius: 7,
                                                maxBarThickness: 38,
                                            } : null
                                        ).filter(Boolean)
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                display: false
                                            },
                                            title: { display: false },
                                            tooltip: { enabled: true },
                                            datalabels: {
                                                color: '#fff',
                                                font: { weight: 'bold', size: 13 },
                                                display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                                                formatter: v => v > 0 ? v : '',
                                            }
                                        },
                                        layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
                                        scales: {
                                            x: {
                                                stacked: true,
                                                grid: { color: '#e5e7eb' },
                                                ticks: { color: '#222', font: { size: 13, family: 'inherit' }, maxRotation: 40, minRotation: 20 }
                                            },
                                            y: {
                                                stacked: true,
                                                beginAtZero: true,
                                                ticks: { stepSize: 1, color: '#222', font: { size: 13, family: 'inherit' } },
                                                grid: { color: '#e5e7eb' }
                                            }
                                        },
                                        barPercentage: 0.7,
                                        categoryPercentage: 0.9,
                                    }}
                                    height={400}
                                    plugins={[ChartDataLabels]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4 analysis-section">
                <div className="col-12 mb-4 analysis-chart-row">
                    <div className="card h-100" style={{
                        minHeight: 600,
                        boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
                        borderRadius: 22,
                        border: '1.5px solid #e0e8f0',
                        background: '#fff'
                    }}>
                        {/* Título estético */}
                        <div style={{
                            textAlign: 'center',
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            paddingTop: '2.5rem',
                            marginBottom: '2rem',
                            fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                        }}>
                            <h3 style={{
                                fontSize: '2rem',
                                fontWeight: '800',
                                letterSpacing: '-1px',
                                marginBottom: '0.5rem',
                                background: 'none',
                                color: '#174ea6',
                                fontFamily: 'inherit',
                                display: 'inline-block',
                                lineHeight: 1.1,
                                position: 'relative'
                            }}>
                                <span style={{
                                    background: 'linear-gradient(90deg, #174ea6, #2563eb 60%, #60a5fa)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    MozBackgroundClip: 'text',
                                    MozTextFillColor: 'transparent',
                                    color: '#174ea6',
                                    display: 'inline',
                                }}>
                                    Análisis de Incidentes por Cuadrante
                                </span>
                            </h3>
                        </div>
                        {/* Filtros de periodo e impacto */}
                        <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 mb-3" style={{
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            marginBottom: 28, gap: 18, paddingBottom: '0.5rem', flexWrap: 'wrap'
                        }}>
                            <div className="d-flex align-items-center gap-2" style={{ background: '#f6f8fa', borderRadius: 8, padding: '0.2rem 0.7rem', border: '1px solid #e5e7eb' }}>
                                <label style={{ color: '#174ea6', fontWeight: 700, fontSize: 13, margin: 0, whiteSpace: 'nowrap' }}>Periodo:</label>
                                <select
                                    value={groupBy}
                                    onChange={e => setGroupBy(e.target.value)}
                                    className="form-control"
                                    style={{ width: 100, fontSize: 13, padding: '0.15rem 0.1rem', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', color: '#174ea6', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
                                >
                                    <option value="dia">Por Día</option>
                                    <option value="semana">Por Semana</option>
                                    <option value="mes">Por Mes</option>
                                </select>
                            </div>
                            <div className="d-flex align-items-center gap-2" style={{ background: '#f6f8fa', borderRadius: 8, padding: '0.2rem 0.7rem', border: '1px solid #e5e7eb' }}>
                                <label style={{ color: '#174ea6', fontWeight: 700, fontSize: 13, margin: 0, whiteSpace: 'nowrap' }}>Impacto:</label>
                                <select
                                    value={impactFilter}
                                    onChange={e => setImpactFilter(e.target.value)}
                                    className="form-control"
                                    style={{ width: 100, fontSize: 13, padding: '0.15rem 0.3rem', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', color: '#174ea6', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
                                >
                                    <option value="all">Todos</option>
                                    <option value="ALTO">Alto Impacto</option>
                                    <option value="BAJO">Bajo Impacto</option>
                                </select>
                            </div>
                        </div>
                        {/* Leyenda personalizada de cuadrantes (arriba, igual que la tercera gráfica) */}
                        <div className="custom-quadrant-legend" style={{
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            margin: '0 0 28px 0',
                            padding: '0.7rem 0',
                            fontFamily: 'inherit',
                            fontSize: 16,
                            rowGap: '1rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '1.3rem',
                        }}>
                            {allQuadrants.map((q, idx) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                        setVisibleQuadrants(v => {
                                            const copy = [...v];
                                            copy[idx] = !copy[idx];
                                            return copy;
                                        });
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 9,
                                        minWidth: 120,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        opacity: visibleQuadrants[idx] ? 1 : 0.4,
                                        outline: 'none',
                                        transition: 'opacity 0.2s',
                                        padding: 0,
                                        fontSize: 15,
                                    }}
                                    aria-pressed={visibleQuadrants[idx]}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: quadrantColors[idx % quadrantColors.length],
                                        marginRight: 7,
                                        border: visibleQuadrants[idx] ? '2px solid #e5e7eb' : '2px solid #cbd5e1',
                                        filter: visibleQuadrants[idx] ? 'none' : 'grayscale(0.7) brightness(1.2)',
                                    }}></span>
                                    <span style={{ color: '#174ea6', fontWeight: 700 }}>{`Cuadrante ${q}`}</span>
                                </button>
                            ))}
                        </div>
                        <div className="card-body" style={{ padding: '2.5rem 2.5rem 1.5rem 2.5rem', height: 420, minHeight: 320, maxHeight: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 18 }}>
                            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minWidth: 0, width: '100%', height: 400, maxHeight: 480, paddingTop: '0.5rem', overflowX: 'auto' }}>
                                <Line
                                    data={{
                                        ...periodQuadrantLineData,
                                        datasets: periodQuadrantLineData.datasets.map((ds, idx) => ({
                                            ...ds,
                                            hidden: !visibleQuadrants[idx],
                                        }))
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            title: { display: false },
                                            tooltip: { enabled: true, backgroundColor: '#174ea6', titleColor: '#fff', bodyColor: '#fff', borderColor: '#e0e8f0', borderWidth: 1 },
                                            datalabels: {
                                                color: '#222',
                                                font: { weight: 'bold', size: 13 },
                                                display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                                                formatter: v => v > 0 ? v : '',
                                                anchor: 'end',
                                                align: 'top',
                                                padding: { top: 8, bottom: 8 },
                                            }
                                        },
                                        interaction: { mode: 'nearest', intersect: false },
                                        scales: {
                                            x: {
                                                ticks: {
                                                    color: '#222',
                                                    font: { size: 12, family: 'Inter, Poppins, Segoe UI, Arial, sans-serif' },
                                                    maxRotation: 40,
                                                    minRotation: 20,
                                                    autoSkip: false,
                                                },
                                                grid: { color: '#e5e7eb' }
                                            },
                                            y: {
                                                beginAtZero: true,
                                                ticks: { stepSize: 1, color: '#222', font: { size: 12, family: 'Inter, Poppins, Segoe UI, Arial, sans-serif' } },
                                                grid: { color: '#e5e7eb' }
                                            }
                                        },
                                        layout: {
                                            padding: {
                                                bottom: 40
                                            }
                                        }
                                    }}
                                    height={400}
                                    plugins={[ChartDataLabels]}
                                />
                            </div>
                        </div>
                        <div style={{
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            paddingBottom: '2.5rem'
                        }}>
                            <div className="quadrant-summary-title-row">
                                <h4 style={{ color: '#174ea6', marginBottom: '0.7rem', fontSize: '1.05rem', fontWeight: '700', letterSpacing: '-0.5px' }}>Resumen por Cuadrante</h4>
                            </div>
                            <div className="quadrant-summary-grid">
                                {allQuadrants.map((quadrant) => {
                                    const quadrantIncidents = filteredForQuadrants.filter(i => i.quadrant === quadrant);
                                    const altoImpact = quadrantIncidents.filter(i => i.crimeImpact === 'ALTO').length;
                                    const bajoImpact = quadrantIncidents.filter(i => i.crimeImpact === 'BAJO').length;
                                    const totalIncidents = altoImpact + bajoImpact;
                                    const hasIncidents = totalIncidents > 0;

                                    return (
                                        <div
                                            key={quadrant}
                                            className={`quadrant-card ${hasIncidents ? 'has-incidents' : ''}`}
                                        >
                                            {hasIncidents && (
                                                <div className="quadrant-badge">
                                                    {totalIncidents}
                                                </div>
                                            )}
                                            <h5 className="quadrant-title">
                                                Cuadrante {quadrant}
                                            </h5>
                                            <div className="quadrant-stats">
                                                <div>
                                                    <span style={{ color: '#ef4444', fontWeight: '700' }}>{altoImpact}</span>
                                                    <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}> Alto</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{bajoImpact}</span>
                                                    <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700 }}> Bajo</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#174ea6', fontWeight: '700' }}>{totalIncidents}</span>
                                                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}> Total</span>
                                                </div>
                                            </div>
                                            <button
                                                className="quadrant-button"
                                                onClick={() => {
                                                    setSelectedQuadrant(quadrant);
                                                    setShowModal(true);
                                                }}
                                                disabled={!hasIncidents}
                                            >
                                                {hasIncidents ? 'Ver Detalles' : 'Sin Incidentes'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Modal para mostrar detalles del cuadrante */}
                        {showModal && (
                            <div className="quadrant-modal-overlay">
                                <div className="quadrant-modal">
                                    {/* Header fijo */}
                                    <div style={{
                                        position: 'sticky',
                                        top: 0,
                                        background: '#fff',
                                        borderBottom: '1px solid #e5e7eb',
                                        padding: '1.5rem 2rem 1rem 2rem',
                                        zIndex: 10,
                                        borderRadius: '12px 12px 0 0'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '1rem'
                                        }}>
                                            <h3 style={{
                                                margin: 0,
                                                color: '#174ea6',
                                                fontWeight: '700',
                                                fontSize: '1.5rem',
                                                fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                                            }}>
                                                Detalles del Cuadrante {selectedQuadrant}
                                            </h3>
                                            <button
                                                onClick={() => setShowModal(false)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    fontSize: '2rem',
                                                    color: '#6b7280',
                                                    cursor: 'pointer',
                                                    padding: '0.5rem',
                                                    borderRadius: '50%',
                                                    width: '40px',
                                                    height: '40px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease',
                                                    ':hover': {
                                                        background: '#f3f4f6',
                                                        color: '#374151'
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = '#f3f4f6';
                                                    e.target.style.color = '#374151';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'none';
                                                    e.target.style.color = '#6b7280';
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>

                                        {/* Botón de exportar a Excel */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginTop: '0.5rem'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    const quadrantIncidents = filteredForQuadrants.filter(i => i.quadrant === selectedQuadrant);
                                                    if (quadrantIncidents.length === 0) {
                                                        alert('No hay incidentes para exportar en este cuadrante con los filtros aplicados.');
                                                        return;
                                                    }

                                                    // Preparar datos para Excel
                                                    const excelData = quadrantIncidents.map(incident => ({
                                                        'Cuadrante': selectedQuadrant,
                                                        'Tipo de Incidente': incident.type === 'Crimen' ? 'Delito' : incident.type,
                                                        'Tipo de Delito': incident.crimeType || 'N/A',
                                                        'Descripción': incident.description || 'N/A',
                                                        'Impacto': incident.crimeImpact || 'N/A',
                                                        'Estado': incident.status || 'N/A',
                                                        'Fecha': new Date(incident.date).toLocaleDateString('es-MX'),
                                                        'Hora': new Date(incident.date).toLocaleTimeString('es-MX'),
                                                        'Dirección': incident.address || 'N/A',
                                                        'Latitud': incident.location?.coordinates?.[1] || incident.location?.lat || 'N/A',
                                                        'Longitud': incident.location?.coordinates?.[0] || incident.location?.lng || 'N/A'
                                                    }));

                                                    // Crear archivo Excel con formato
                                                    const worksheet = XLSX.utils.json_to_sheet(excelData);

                                                    // Configurar anchos de columna
                                                    const columnWidths = [
                                                        { wch: 10 }, // Cuadrante
                                                        { wch: 20 }, // Tipo de Incidente
                                                        { wch: 25 }, // Tipo de Delito
                                                        { wch: 40 }, // Descripción
                                                        { wch: 12 }, // Impacto
                                                        { wch: 15 }, // Estado
                                                        { wch: 12 }, // Fecha
                                                        { wch: 10 }, // Hora
                                                        { wch: 35 }, // Dirección
                                                        { wch: 12 }, // Latitud
                                                        { wch: 12 }  // Longitud
                                                    ];
                                                    worksheet['!cols'] = columnWidths;

                                                    // Crear workbook
                                                    const workbook = XLSX.utils.book_new();

                                                    // Agregar hoja con nombre descriptivo
                                                    XLSX.utils.book_append_sheet(workbook, worksheet, `Cuadrante_${selectedQuadrant}`);

                                                    // Generar y descargar archivo
                                                    const fileName = `incidentes_cuadrante_${selectedQuadrant}_${new Date().toISOString().split('T')[0]}.xlsx`;
                                                    XLSX.writeFile(workbook, fileName);
                                                }}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                                                    fontFamily: 'Inter, Poppins, Segoe UI, Arial, sans-serif'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = 'translateY(-1px)';
                                                    e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'translateY(0)';
                                                    e.target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                                                }}
                                            >
                                                📊 Generar Reporte XLSX
                                            </button>
                                        </div>
                                    </div>

                                    {/* Contenido scrolleable */}
                                    <div style={{
                                        padding: '1rem 2rem 2rem 2rem',
                                        maxHeight: '60vh',
                                        overflowY: 'auto',
                                        borderRadius: '0 0 12px 12px'
                                    }}>
                                        {filteredForQuadrants
                                            .filter(i => i.quadrant === selectedQuadrant)
                                            .map((incident, idx) => (
                                                <div key={idx} className="incident-card">
                                                    <div className="incident-header">
                                                        <h4 className="incident-type">
                                                            {incident.type === 'Crimen' ? 'Delito' : incident.type}
                                                        </h4>
                                                        <span className={`incident-impact ${incident.crimeImpact === 'ALTO' ? 'high' : 'low'}`}>
                                                            {incident.crimeImpact}
                                                        </span>
                                                    </div>
                                                    <p className="incident-description">
                                                        {incident.description}
                                                    </p>
                                                    <div className="incident-meta">
                                                        <span>Fecha: {new Date(incident.date).toLocaleDateString()}</span>
                                                        <span>Estado: {incident.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;