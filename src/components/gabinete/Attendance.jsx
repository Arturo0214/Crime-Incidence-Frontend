import React, { useState, useEffect } from 'react';
import { Row, Col, Table, Button, Modal, Form } from 'react-bootstrap';
import './Attendance.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, addAttendance } from '../../slices/attendanceSlice';
import { isAdmin } from '../../utils/auth';

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

const Attendance = () => {
    const { attendance, loading } = useSelector(state => state.attendance);
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.user);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({});
    const [attendanceSuccess, setAttendanceSuccess] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const week = getWeekNumber(now);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    });
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [firstLoad, setFirstLoad] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Utilidades
    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }
    function getWeekRange(isoWeek) {
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
    const getLocalDateOnly = (dateString) => {
        const datePart = dateString.split('T')[0];
        if (!datePart) return new Date();
        const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
        return new Date(year, month - 1, day, 12, 0, 0);
    };

    useEffect(() => {
        if (firstLoad) {
            dispatch(fetchAttendance());
            setFirstLoad(false);
        }
    }, [dispatch, firstLoad]);

    // Actualizar el estado inicial del mes seleccionado
    useEffect(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
    }, []);

    // Filtrar asistencias de la semana seleccionada usando compensación por zona horaria
    const weekDates = getWeekRange(selectedWeek);
    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[4]);
    weekEnd.setHours(23, 59, 59, 999);
    const weekAttendance = attendance.filter(a => {
        const attendanceLocalDate = getLocalDateOnly(a.date);
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
    weekAttendance.forEach(a => {
        a.participants.forEach(p => {
            const id = String(p.participantId._id || p.participantId);
            if (summary[id]) {
                summary[id].week[p.attendance]++;
            }
        });
    });
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

    const handleAttendanceSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setSubmitError(null);
        setAttendanceSuccess(null);
        try {
            const newAttendance = {
                date: selectedDate,
                participants: participants.map(participant => ({
                    participantId: participant.id,
                    attendance: attendanceData[participant.id] || 'ausente'
                }))
            };
            await dispatch(addAttendance(newAttendance)).unwrap();
            setAttendanceSuccess('¡Asistencia registrada correctamente!');
            setTimeout(() => {
                setShowAttendanceModal(false);
                setAttendanceSuccess(null);
            }, 1200);
        } catch (err) {
            setSubmitError('Error al registrar asistencia: ' + (err?.response?.data?.error || err.message));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleAttendanceChange = (participantId, value) => {
        setAttendanceData(prev => ({
            ...prev,
            [participantId]: value
        }));
    };

    if (loading) return <div>Loading...</div>;

    if (!isAdmin(user)) {
        return <div className="text-center text-muted">Solo los administradores pueden ver y tomar asistencia.</div>;
    }

    return (
        <div className="attendance-section">
            {/* Fila 1: Título */}
            <Row className="mb-2">
                <Col xs={12}>
                    <h4 className="mb-2 mb-md-0 text-center text-md-start">Registro de Asistencia</h4>
                </Col>
            </Row>
            {/* Fila 2: Filtros */}
            <Row className="g-2 align-items-center mb-2">
                <Col xs={12} md={3}>
                    <label className="fw-bold mb-1 mb-md-0">Semana:</label>
                    <input
                        type="week"
                        value={selectedWeek}
                        onChange={e => setSelectedWeek(e.target.value)}
                        className="form-control"
                    />
                </Col>
                <Col xs={12} md={3}>
                    <label className="fw-bold mb-1 mb-md-0">Mes:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="form-control"
                    />
                </Col>
                {/* Espacio para alinear el botón a la derecha en desktop */}
                <Col xs={12} md={6} className="d-none d-md-block" />
            </Row>
            {/* Fila 3: Botón */}
            <Row className="mb-3">
                <Col xs={12} md={{ span: 3, offset: 9 }} className="text-center text-md-end">
                    <Button variant="primary" onClick={() => setShowAttendanceModal(true)} className="w-100 w-md-auto attendance-button">
                        Tomar Asistencia
                    </Button>
                </Col>
            </Row>
            {/* Resumen por semana y mes */}
            <div className="attendance-summary mb-4">
                <Table bordered size="sm" className="mb-0 compact-attendance-table">
                    <thead style={{ background: '#2c3e50' }}>
                        <tr>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.95rem', padding: '6px 4px' }}>Dependencia</th>
                            <th colSpan="3" className="text-center" style={{ color: '#fff', fontSize: '0.95rem', padding: '6px 4px' }}>Semana</th>
                            <th colSpan="3" className="text-center" style={{ color: '#fff', fontSize: '0.95rem', padding: '6px 4px' }}>Mes</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.95rem', padding: '6px 4px' }}>Resumen</th>
                        </tr>
                        <tr>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}></th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Titular</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Suplente</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Ausente</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Titular</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Suplente</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Ausente</th>
                            <th className="text-center" style={{ color: '#fff', fontSize: '0.9rem', padding: '4px 2px' }}>Asistencia Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(part => {
                            const totalWeek = summary[part.id].week.titular + summary[part.id].week.suplente + summary[part.id].week.ausente;
                            const totalMonth = summary[part.id].month.titular + summary[part.id].month.suplente + summary[part.id].month.ausente;
                            const asistenciasTitular = summary[part.id].month.titular;
                            const asistenciasSuplente = summary[part.id].month.suplente;
                            const ausencias = summary[part.id].month.ausente;
                            const totalAsistencias = asistenciasTitular + asistenciasSuplente;
                            let resumenText = '';
                            if (totalMonth > 0) {
                                resumenText = `<span style='font-weight:600;'>${totalAsistencias}/${totalMonth}</span> asistencias`;
                                if (asistenciasTitular > 0) resumenText += ` <span style='color:#2563eb;'>Titular: ${asistenciasTitular}</span>`;
                                if (asistenciasSuplente > 0) resumenText += ` <span style='color:#198754;'>Suplente: ${asistenciasSuplente}</span>`;
                                if (ausencias > 0) resumenText += ` <span style='color:#dc3545;'>Ausencias: ${ausencias}</span>`;
                            } else {
                                resumenText = 'Sin registros';
                            }
                            return (
                                <tr key={part.id} style={{ fontSize: '0.92rem', height: 32 }}>
                                    <td style={{ fontWeight: 600, padding: '4px 6px', verticalAlign: 'middle' }}>{part.name}</td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status titular compact-badge">{summary[part.id].week.titular}</span></td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status suplente compact-badge">{summary[part.id].week.suplente}</span></td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status ausente compact-badge">{summary[part.id].week.ausente}</span></td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status titular compact-badge">{summary[part.id].month.titular}</span></td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status suplente compact-badge">{summary[part.id].month.suplente}</span></td>
                                    <td className="text-center" style={{ padding: '2px 4px', verticalAlign: 'middle' }}><span className="attendance-status ausente compact-badge">{summary[part.id].month.ausente}</span></td>
                                    <td className="text-center" style={{ fontSize: '0.85rem', padding: '2px 4px', verticalAlign: 'middle' }} dangerouslySetInnerHTML={{ __html: resumenText }}></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>
            {/* Tablero de asistencia semanal */}
            {firstLoad && loading ? (
                <div className="text-center text-muted">Cargando...</div>
            ) : weekAttendance.length === 0 ? (
                <div className="text-center text-muted">No hay registros de asistencia para esta semana.</div>
            ) : (
                (() => {
                    const allParticipants = {};
                    weekAttendance.forEach(a => {
                        a.participants.forEach(p => {
                            const id = p.participantId._id || p.participantId;
                            const frontendParticipant = participants.find(fp => String(fp.id) === String(id));
                            const name = frontendParticipant ? frontendParticipant.name : (p.participantId.name || p.participantId);
                            if (!allParticipants[id]) {
                                allParticipants[id] = {
                                    id,
                                    name,
                                    role: frontendParticipant ? frontendParticipant.role : (p.participantId.role || ''),
                                    counts: { titular: 0, suplente: 0, ausente: 0 }
                                };
                            }
                        });
                    });
                    const participantsArr = participants.map(fp => allParticipants[fp.id] || { id: fp.id, name: fp.name, role: fp.role });
                    return (
                        <div className="attendance-board-wrapper">
                            <Table responsive bordered className="attendance-board" style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th className="text-center" style={{ minWidth: 140 }}>Dependencia</th>
                                        {weekDates.map(date => (
                                            <th key={date.toISOString().slice(0, 10)} className="text-center" style={{ minWidth: 110 }}>{date.toLocaleDateString()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantsArr.map(part => (
                                        <tr key={part.id}>
                                            <td style={{ fontWeight: 600 }}>{part.name}</td>
                                            {weekDates.map(date => {
                                                const columnDate = new Date(date);
                                                columnDate.setHours(0, 0, 0, 0);
                                                const record = weekAttendance.find(a => {
                                                    const attendanceLocalDate = getLocalDateOnly(a.date);
                                                    return (
                                                        attendanceLocalDate.getFullYear() === columnDate.getFullYear() &&
                                                        attendanceLocalDate.getMonth() === columnDate.getMonth() &&
                                                        attendanceLocalDate.getDate() === columnDate.getDate()
                                                    );
                                                });
                                                let status = '';
                                                if (record) {
                                                    const found = record.participants.find(p => (p.participantId._id || p.participantId) === part.id);
                                                    if (found) {
                                                        status = found.attendance;
                                                    }
                                                }
                                                return (
                                                    <td key={date.toISOString().slice(0, 10)} className="text-center">
                                                        {status && (
                                                            <span className={`attendance-status ${status}`}>
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    );
                })()
            )}
            {/* Modal de Asistencia */}
            <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="md" centered>
                <div className="attendance-modal-header" style={{ position: 'relative' }}>
                    Tomar Asistencia
                    <button
                        type="button"
                        aria-label="Cerrar"
                        onClick={() => setShowAttendanceModal(false)}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 16,
                            background: 'transparent',
                            border: 'none',
                            fontSize: 22,
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 700,
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>
                <Modal.Body style={{ padding: 0, background: '#f8fafc', borderRadius: 0 }}>
                    <div className="attendance-modal-card">
                        <Form onSubmit={handleAttendanceSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: 600, color: '#2563eb' }}>Fecha</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                    style={{ maxWidth: 180, borderRadius: 6, border: '1px solid #b6c3d1' }}
                                />
                            </Form.Group>
                            <Table className="attendance-modal-table" bordered size="sm">
                                <thead>
                                    <tr>
                                        <th>Dependencia</th>
                                        <th className="text-center">Titular</th>
                                        <th className="text-center">Suplente</th>
                                        <th className="text-center">Ausente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((participant, i) => (
                                        <tr key={participant.id}>
                                            <td>{participant.name}</td>
                                            <td>
                                                <div className="attendance-radio-group">
                                                    <Form.Check
                                                        className="attendance-radio"
                                                        type="radio"
                                                        id={`titular-${participant.id}`}
                                                        name={`attendance-${participant.id}`}
                                                        value="titular"
                                                        onChange={() => handleAttendanceChange(participant.id, 'titular')}
                                                        checked={attendanceData[participant.id] === 'titular'}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="attendance-radio-group">
                                                    <Form.Check
                                                        className="attendance-radio"
                                                        type="radio"
                                                        id={`suplente-${participant.id}`}
                                                        name={`attendance-${participant.id}`}
                                                        value="suplente"
                                                        onChange={() => handleAttendanceChange(participant.id, 'suplente')}
                                                        checked={attendanceData[participant.id] === 'suplente'}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="attendance-radio-group">
                                                    <Form.Check
                                                        className="attendance-radio"
                                                        type="radio"
                                                        id={`ausente-${participant.id}`}
                                                        name={`attendance-${participant.id}`}
                                                        value="ausente"
                                                        onChange={() => handleAttendanceChange(participant.id, 'ausente')}
                                                        checked={attendanceData[participant.id] === 'ausente' || !attendanceData[participant.id]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {submitError && <div className="text-danger mt-2">{submitError}</div>}
                            {attendanceSuccess && <div className="text-success mt-2">{attendanceSuccess}</div>}
                            <div className="attendance-modal-btns">
                                <Button variant="secondary" onClick={() => setShowAttendanceModal(false)} disabled={submitLoading} style={{ borderRadius: 6, minWidth: 100 }}>
                                    Cancelar
                                </Button>
                                <Button variant="primary" type="submit" disabled={submitLoading} style={{ borderRadius: 6, minWidth: 140, fontWeight: 600 }}>
                                    {submitLoading ? 'Guardando...' : 'Guardar Asistencia'}
                                </Button>
                            </div>
                        </Form>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default Attendance; 