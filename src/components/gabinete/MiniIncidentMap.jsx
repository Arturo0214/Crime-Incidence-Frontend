import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';

const MiniIncidentMap = ({ feature, onQuadrantClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Calcular centroide con turf
    const centroid = useMemo(() => {
        if (!feature) return [19.4555, -99.1405];
        try {
            const center = turf.centroid(feature);
            return [center.geometry.coordinates[1], center.geometry.coordinates[0]];
        } catch {
            return [19.4555, -99.1405];
        }
    }, [feature]);

    if (!feature) return null;

    const handleMapClick = () => {
        if (onQuadrantClick && feature.properties.no_cdrn) {
            onQuadrantClick(feature.properties.no_cdrn);
        }
    };

    return (
        <div
            style={{ width: 180, height: 180, margin: '0 auto', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,62,80,0.08)' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleMapClick}
            className="cursor-pointer"
        >
            <MapContainer
                center={centroid}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                keyboard={false}
                touchZoom={false}
                boxZoom={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                    data={feature}
                    style={{
                        color: '#2E7D32',
                        weight: 3,
                        fillColor: isHovered ? '#1B5E20' : '#4CAF50',
                        fillOpacity: isHovered ? 0.5 : 0.35
                    }}
                />
            </MapContainer>
        </div>
    );
};

export default MiniIncidentMap; 