import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';

const MiniIncidentMap = ({ feature, onQuadrantClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [mapError, setMapError] = useState(false);

    // Calcular centroide y límites con turf
    const { centroid, bounds } = useMemo(() => {
        if (!feature) return {
            centroid: [19.4555, -99.1405],
            bounds: null
        };
        try {
            const center = turf.centroid(feature);
            const bbox = turf.bbox(feature);
            return {
                centroid: [center.geometry.coordinates[1], center.geometry.coordinates[0]],
                bounds: [
                    [bbox[1], bbox[0]], // [south, west]
                    [bbox[3], bbox[2]]  // [north, east]
                ]
            };
        } catch {
            return {
                centroid: [19.4555, -99.1405],
                bounds: null
            };
        }
    }, [feature]);

    if (!feature) return null;

    const handleMapClick = (e) => {
        e.stopPropagation();
        if (onQuadrantClick && feature.properties.no_cdrn) {
            onQuadrantClick(feature.properties.no_cdrn);
        }
    };

    const handleTileError = () => {
        setMapError(true);
    };

    if (mapError) {
        return (
            <div
                onClick={handleMapClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    cursor: 'pointer',
                    height: '200px',
                    width: '100%',
                    borderRadius: '8px',
                    background: isHovered ? '#4CAF50' : '#81C784',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                }}
            >
                Cuadrante {feature.properties.no_cdrn}
            </div>
        );
    }

    return (
        <div
            onClick={handleMapClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ cursor: 'pointer' }}
        >
            <MapContainer
                center={centroid}
                zoom={14}
                style={{ height: '200px', width: '100%', borderRadius: '8px' }}
                zoomControl={false}
                dragging={false}
                touchZoom={false}
                doubleClickZoom={false}
                scrollWheelZoom={false}
                boxZoom={false}
                keyboard={false}
                whenReady={(map) => {
                    if (bounds) {
                        map.target.fitBounds(bounds, {
                            padding: [20, 20],
                            maxZoom: 15,
                            animate: false
                        });
                    }
                }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    eventHandlers={{
                        error: handleTileError
                    }}
                />
                <GeoJSON
                    data={feature}
                    style={{
                        color: '#2E7D32',
                        weight: 3,
                        fillColor: isHovered ? '#4CAF50' : '#81C784',
                        fillOpacity: 0.35
                    }}
                />
            </MapContainer>
        </div>
    );
};

export default MiniIncidentMap; 