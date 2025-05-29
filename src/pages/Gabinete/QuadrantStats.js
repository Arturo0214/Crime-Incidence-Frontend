import React from 'react';

const QuadrantStats = ({ incidents, quadrantNumber }) => {
    const quadrantIncidents = incidents.filter(incident => incident.quadrant === quadrantNumber);
    const stats = {
        total: quadrantIncidents.length,
        highImpact: quadrantIncidents.filter(i => i.crimeImpact === 'ALTO').length,
        lowImpact: quadrantIncidents.filter(i => i.crimeImpact === 'BAJO').length,
        byType: quadrantIncidents.reduce((acc, incident) => {
            if (!acc[incident.type]) {
                acc[incident.type] = 0;
            }
            acc[incident.type]++;
            return acc;
        }, {})
    };
    return (
        <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
            <div className="stat-item flex-grow-1 me-2">
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-item flex-grow-1 me-2">
                <div className="stat-label">Alto</div>
                <div className="stat-value high-impact">{stats.highImpact}</div>
            </div>
            <div className="stat-item flex-grow-1">
                <div className="stat-label">Bajo</div>
                <div className="stat-value low-impact">{stats.lowImpact}</div>
            </div>
        </div>
    );
};

export default QuadrantStats; 