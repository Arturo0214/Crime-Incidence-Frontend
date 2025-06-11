import React, { useEffect, useState } from 'react';
import { getCitizenRequests, createCitizenRequest, updateCitizenRequest, updateCitizenRequestStatus, addCitizenRequestComment, deleteCitizenRequest, editCitizenRequestComment, deleteCitizenRequestComment } from '../../services/citizenrequests';
import Modal from 'react-modal';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import './CitizenRequests.css';
import * as XLSX from 'xlsx';

// Setear el elemento raíz para accesibilidad del modal
Modal.setAppElement('#root');

const STATUS_OPTIONS = ['Pendiente', 'Asignado', 'En investigación', 'En Proceso', 'Atendido', 'Archivado'];

const CitizenRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newRequest, setNewRequest] = useState({
        title: '',
        description: '',
        requesterName: '',
        requesterPhone: '',
        street: '',
        longitude: '',
        latitude: ''
    });
    const [creating, setCreating] = useState(false);
    const [commentText, setCommentText] = useState({});
    const [statusUpdating, setStatusUpdating] = useState({});
    const [formError, setFormError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingComment, setEditingComment] = useState({});
    const [editCommentText, setEditCommentText] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [editingRequest, setEditingRequest] = useState(null);

    const user = useSelector(state => state.user.user);

    const getUserName = () => {
        if (user?.name) return user.name;
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = jwtDecode(token);
                return payload.name || 'Usuario';
            } catch {
                return 'Usuario';
            }
        }
        return '';
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getCitizenRequests();
            setRequests(data);
        } catch (err) {
            setError('Error al cargar peticiones');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const openModal = () => {
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (req) => {
        setFormError('');
        setFieldErrors({});
        setEditingRequest(req);
        setNewRequest({
            title: req.title || '',
            description: req.description || '',
            requesterName: req.requester?.name || req.requesterName || '',
            requesterPhone: req.requester?.phone || req.requesterPhone || '',
            street: req.location?.street || req.street || '',
            latitude: req.location?.coordinates?.coordinates?.[1]?.toString() || req.latitude || '',
            longitude: req.location?.coordinates?.coordinates?.[0]?.toString() || req.longitude || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setNewRequest({
            title: '',
            description: '',
            requesterName: '',
            requesterPhone: '',
            street: '',
            longitude: '',
            latitude: ''
        });
        setEditingRequest(null);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        setFieldErrors({});
        setCreating(true);
        const errors = {};
        if (!newRequest.title) errors.title = 'El título es obligatorio.';
        if (!newRequest.description) errors.description = 'La descripción es obligatoria.';
        if (!newRequest.requesterName) errors.requesterName = 'El nombre es obligatorio.';
        if (!newRequest.requesterPhone) errors.requesterPhone = 'El teléfono es obligatorio.';
        if (!newRequest.street) errors.street = 'La calle es obligatoria.';
        if (newRequest.longitude === '' || isNaN(parseFloat(newRequest.longitude))) {
            errors.longitude = 'La longitud es obligatoria y debe ser un número.';
        } else if (parseFloat(newRequest.longitude) < -180 || parseFloat(newRequest.longitude) > 180) {
            errors.longitude = 'La longitud debe estar entre -180 y 180.';
        }
        if (newRequest.latitude === '' || isNaN(parseFloat(newRequest.latitude))) {
            errors.latitude = 'La latitud es obligatoria y debe ser un número.';
        } else if (parseFloat(newRequest.latitude) < -90 || parseFloat(newRequest.latitude) > 90) {
            errors.latitude = 'La latitud debe estar entre -90 y 90.';
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setFormError('Por favor corrige los errores.');
            setCreating(false);
            return;
        }
        try {
            if (editingRequest) {
                await updateCitizenRequest(editingRequest._id, newRequest);
            } else {
                await createCitizenRequest(newRequest);
            }
            setNewRequest({
                title: '',
                description: '',
                requesterName: '',
                requesterPhone: '',
                street: '',
                longitude: '',
                latitude: ''
            });
            fetchRequests();
            closeModal();
            setEditingRequest(null);
        } catch (err) {
            setFormError('Error al guardar la petición.');
            setError('Error al guardar la petición');
        }
        setCreating(false);
    };

    const handleStatusChange = async (id, status) => {
        setStatusUpdating(s => ({ ...s, [id]: true }));
        try {
            await updateCitizenRequestStatus(id, status);
            fetchRequests();
        } catch (err) {
            setError('Error al actualizar estado');
        }
        setStatusUpdating(s => ({ ...s, [id]: false }));
    };

    const handleAddComment = async (id) => {
        if (!commentText[id]) return;
        const author = getUserName();
        if (!author) return;
        try {
            await addCitizenRequestComment(id, commentText[id], author);
            setCommentText(t => ({ ...t, [id]: '' }));
            fetchRequests();
        } catch (err) {
            setError('Error al añadir comentario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar petición?')) return;
        try {
            await deleteCitizenRequest(id);
            fetchRequests();
        } catch (err) {
            setError('Error al eliminar petición');
        }
    };

    const handleEditComment = (reqId, idx, currentText) => {
        setEditingComment({ reqId, idx });
        setEditCommentText({ ...editCommentText, [`${reqId}_${idx}`]: currentText });
    };

    const handleCancelEdit = () => {
        setEditingComment({});
    };

    const handleSaveEdit = async (reqId, idx) => {
        try {
            await editCitizenRequestComment(reqId, idx, editCommentText[`${reqId}_${idx}`]);
            setEditingComment({});
            fetchRequests();
        } catch (err) {
            setError('Error al editar comentario');
        }
    };

    const handleDeleteComment = async (reqId, idx) => {
        if (!window.confirm('¿Eliminar este comentario?')) return;
        try {
            await deleteCitizenRequestComment(reqId, idx);
            fetchRequests();
        } catch (err) {
            setError('Error al eliminar comentario');
        }
    };

    // Función para exportar todas las peticiones ciudadanas a Excel (sin comentarios)
    const handleExportExcel = () => {
        if (!requests.length) {
            alert('No hay peticiones para exportar.');
            return;
        }
        const data = [
            [
                'Título',
                'Descripción',
                'Solicitante',
                'Teléfono',
                'Calle',
                'Longitud',
                'Latitud',
                'Estado',
                'Fecha de creación',
                'ID'
            ]
        ];
        requests.forEach(req => {
            data.push([
                req.title || '',
                req.description || '',
                req.requester?.name || req.requesterName || '',
                req.requester?.phone || req.requesterPhone || '',
                req.location?.street || req.street || '',
                req.location?.longitude || req.longitude || '',
                req.location?.latitude || req.latitude || '',
                req.status || '',
                req.createdAt ? new Date(req.createdAt).toLocaleString() : '',
                req._id || ''
            ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Peticiones Ciudadanas');
        const fileName = `Reporte_Peticiones_Ciudadanas_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="citizen-requests-section" style={{ background: '#f8fafc', borderRadius: 10, padding: 24, marginBottom: 32 }}>
            <h4 style={{ fontWeight: 700, color: '#2563eb', marginBottom: 18 }}>Peticiones Ciudadanas</h4>
            <button onClick={openModal} className="cr-main-btn">
                + Agregar Petición
            </button>
            <button onClick={handleExportExcel} className="cr-main-btn excel">
                <i className="fas fa-file-excel" style={{ marginRight: 6 }}></i>
                Exportar a Excel
            </button>
            <Modal
                isOpen={modalOpen}
                onRequestClose={closeModal}
                contentLabel={editingRequest ? "Editar Petición Ciudadana" : "Agregar Petición Ciudadana"}
                style={{
                    overlay: { backgroundColor: 'rgba(20, 23, 31, 0.75)' },
                    content: {
                        maxWidth: 480,
                        margin: 'auto',
                        borderRadius: 18,
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0
                    }
                }}
            >
                <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.12)', padding: '0 0 24px 0', position: 'relative', minHeight: 0 }}>
                    <button
                        type="button"
                        aria-label="Cerrar"
                        onClick={closeModal}
                        style={{
                            position: 'absolute',
                            top: 18,
                            right: 22,
                            background: 'transparent',
                            border: 'none',
                            fontSize: 22,
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontWeight: 700,
                            lineHeight: 1,
                            zIndex: 2
                        }}
                    >
                        ×
                    </button>
                    <div style={{
                        background: 'linear-gradient(90deg, #2563eb 60%, #1e40af 100%)',
                        borderTopLeftRadius: 18,
                        borderTopRightRadius: 18,
                        padding: '22px 28px 18px 28px',
                        borderBottom: '2.5px solid #e3e8ee',
                        marginBottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 0
                    }}>
                        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.5, margin: 0, textAlign: 'center', width: '100%' }}>
                            {editingRequest ? 'Editar Petición Ciudadana' : 'Nueva Petición Ciudadana'}
                        </h3>
                    </div>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 28px 0 28px' }}>
                        <input
                            type="text"
                            placeholder="Título"
                            value={newRequest.title}
                            onChange={e => setNewRequest(n => ({ ...n, title: e.target.value }))}
                            required
                            style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                        />
                        {fieldErrors.title && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.title}</div>}
                        <input
                            type="text"
                            placeholder="Descripción"
                            value={newRequest.description}
                            onChange={e => setNewRequest(n => ({ ...n, description: e.target.value }))}
                            required
                            style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                        />
                        {fieldErrors.description && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.description}</div>}
                        <input
                            type="text"
                            placeholder="Nombre del solicitante"
                            value={newRequest.requesterName}
                            onChange={e => setNewRequest(n => ({ ...n, requesterName: e.target.value }))}
                            required
                            style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                        />
                        {fieldErrors.requesterName && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.requesterName}</div>}
                        <input
                            type="tel"
                            placeholder="Teléfono de contacto"
                            value={newRequest.requesterPhone}
                            onChange={e => setNewRequest(n => ({ ...n, requesterPhone: e.target.value }))}
                            required
                            style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                        />
                        {fieldErrors.requesterPhone && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.requesterPhone}</div>}
                        <input
                            type="text"
                            placeholder="Calle"
                            value={newRequest.street}
                            onChange={e => setNewRequest(n => ({ ...n, street: e.target.value }))}
                            required
                            style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                        />
                        {fieldErrors.street && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.street}</div>}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    placeholder="Latitud"
                                    value={newRequest.latitude}
                                    onChange={e => setNewRequest(n => ({ ...n, latitude: e.target.value }))}
                                    required
                                    step="any"
                                    style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                                />
                                {fieldErrors.latitude && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.latitude}</div>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    placeholder="Longitud"
                                    value={newRequest.longitude}
                                    onChange={e => setNewRequest(n => ({ ...n, longitude: e.target.value }))}
                                    required
                                    step="any"
                                    style={{ padding: 14, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 16, marginBottom: 2, background: '#f8fafc' }}
                                />
                                {fieldErrors.longitude && <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 2 }}>{fieldErrors.longitude}</div>}
                            </div>
                        </div>
                        {formError && <div style={{ color: '#dc3545', marginTop: 2, fontWeight: 600, textAlign: 'center' }}>{formError}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                            <button type="button" onClick={closeModal} style={{ background: '#e3e8ee', color: '#222', border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 600, fontSize: 15, transition: 'background 0.2s', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={creating} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 15, boxShadow: '0 1px 4px #0001', cursor: 'pointer', transition: 'background 0.2s' }}>
                                {creating ? (editingRequest ? 'Guardando...' : 'Creando...') : (editingRequest ? 'Guardar Cambios' : 'Guardar')}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
            {loading ? <div>Cargando...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {requests.map(req => (
                        <div key={req._id} className="cr-card" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #0001', padding: 16, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                            <div className="cr-card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', position: 'relative' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 17, color: '#222' }}>{req.title}</div>
                                    <div style={{ color: '#555', fontSize: 15 }}>{req.description}</div>
                                    {req.requester && (
                                        <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                                            <div><strong>Solicitante:</strong> {req.requester.name}</div>
                                            <div><strong>Teléfono:</strong> {req.requester.phone}</div>
                                            <div><strong>Ubicación:</strong> {req.location?.street}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="cr-header-actions-group">
                                    <select
                                        value={req.status}
                                        onChange={e => handleStatusChange(req._id, e.target.value)}
                                        disabled={statusUpdating[req._id]}
                                        className={`cr-status-select cr-status-badge cr-status-${req.status?.toLowerCase()}`}
                                        style={{ marginBottom: 8, marginTop: 0 }}
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <div className="cr-header-actions">
                                        <button onClick={() => handleDelete(req._id)} className="cr-header-delete-btn">Eliminar</button>
                                        <button onClick={() => openEditModal(req)} className="cr-header-edit-btn">Editar</button>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 8, marginBottom: 4, fontSize: 14, color: '#888' }}>
                                Estado: <b style={{ color: '#2563eb' }}>{req.status}</b> | Creado: {new Date(req.createdAt).toLocaleString()}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <b style={{ color: '#1e3a8a' }}>Comentarios:</b>
                                <div style={{ marginTop: 4, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {req.comments && req.comments.length > 0 ? req.comments.map((c, idx) => {
                                        const isOwnComment = getUserName() && c.author === getUserName();
                                        const isEditing = editingComment.reqId === req._id && editingComment.idx === idx;
                                        return (
                                            <div key={idx} className="cr-comment-row">
                                                <span className="cr-comment-author">{c.author}:</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editCommentText[`${req._id}_${idx}`] || ''}
                                                        onChange={e => setEditCommentText(t => ({ ...t, [`${req._id}_${idx}`]: e.target.value }))}
                                                        className="cr-comment-input"
                                                    />
                                                ) : (
                                                    <span className="cr-comment-text">{c.text}</span>
                                                )}
                                                <span className="cr-comment-date">{new Date(c.date).toLocaleString()}</span>
                                                {isOwnComment && !isEditing && (
                                                    <>
                                                        <button onClick={() => handleEditComment(req._id, idx, c.text)} className="cr-comment-edit-btn">Editar</button>
                                                        <button onClick={() => handleDeleteComment(req._id, idx)} className="cr-comment-delete-btn">Eliminar</button>
                                                    </>
                                                )}
                                                {isOwnComment && isEditing && (
                                                    <>
                                                        <button onClick={() => handleSaveEdit(req._id, idx)} className="cr-comment-save-btn">Guardar</button>
                                                        <button onClick={handleCancelEdit} className="cr-comment-cancel-btn">Cancelar</button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    }) : <span style={{ color: '#aaa', fontSize: 13 }}>Sin comentarios</span>}
                                </div>
                                <div className="cr-comment-form-row">
                                    <input
                                        type="text"
                                        placeholder="Comentario"
                                        value={commentText[req._id] || ''}
                                        onChange={e => setCommentText(t => ({ ...t, [req._id]: e.target.value }))}
                                        className="cr-comment-form"
                                        disabled={!getUserName()}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Tu nombre"
                                        value={getUserName()}
                                        disabled
                                        className="cr-comment-form cr-comment-userinput"
                                    />
                                </div>
                                <div className="cr-comment-form-actions">
                                    <button
                                        onClick={() => handleAddComment(req._id)}
                                        className="cr-comment-add-btn"
                                        disabled={!getUserName() || !commentText[req._id]}
                                    >
                                        Comentar
                                    </button>
                                    {getUserName() && (
                                        <span className="cr-comment-user">Comentar como: <b>{getUserName()}</b></span>
                                    )}
                                    {!getUserName() && (
                                        <span className="cr-comment-login">Inicia sesión para comentar</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CitizenRequests; 