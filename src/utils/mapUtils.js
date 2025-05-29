// Colores para los diferentes niveles de impacto
export const IMPACT_COLORS = {
    GREEN: '#4CAF50', // Verde para bajo índice de delitos
    YELLOW: '#FFC107', // Amarillo para mediano índice
    RED: '#F44336', // Rojo para alto índice
    DEFAULT: '#9E9E9E' // Gris para calles sin datos
};

// Centro de Tlatelolco
export const TLATELOLCO_CENTER = {
    lat: 19.4500,
    lng: -99.1400
};

// Nivel de zoom para el mapa
export const DEFAULT_ZOOM = 15;

// Estilo para las calles en el mapa
export const getStreetStyle = (feature) => {
    const color = feature.properties.color || IMPACT_COLORS.DEFAULT;

    return {
        fillColor: color,
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
};

// Contenido del popup para cada calle
export const getPopupContent = (feature) => {
    const { name, count, highImpact, lowImpact } = feature.properties;

    return `
    <div class="popup-content">
      <h3>${name}</h3>
      <p><strong>Total de incidentes:</strong> ${count}</p>
      <p><strong>Alto impacto:</strong> ${highImpact}</p>
      <p><strong>Bajo impacto:</strong> ${lowImpact}</p>
    </div>
  `;
};

// Categorías de delitos
export const DELITOS_ALTO_IMPACTO = [
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
    'Desaparición forzada'
];

export const DELITOS_BAJO_IMPACTO = [
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
    'Posesión de drogas para consumo personal'
]; 