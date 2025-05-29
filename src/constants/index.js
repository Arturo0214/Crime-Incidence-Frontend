// Tipos de incidentes
export const INCIDENT_TYPES = [
    'Crimen',
    'Poda de árboles',
    'Personas en situación de calle',
    'Tránsito de motocicletas',
    'Robo de autopartes',
    'Iluminación',
    'Infestación',
    'Cámaras',
    'Petición ciudadana',
    'Otro'
];

// Obtener el número de semana ISO en zona local
export function getWeekNumber(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Obtener el rango de fechas (lunes a viernes) de una semana ISO en zona local
export function getWeekRange(isoWeek) {
    const [year, week] = isoWeek.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    let dayOfWeek = jan4.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
    return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return d;
    });
}

// Badge de estado para incidentes y acuerdos
export function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
        case 'reportado':
            return 'bg-info';
        case 'en investigación':
            return 'bg-warning';
        case 'resuelto':
            return 'bg-success';
        case 'archivado':
            return 'bg-secondary';
        case 'completado':
            return 'bg-success';
        case 'pendiente':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
} 