import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Modal, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgreements, addComment, editComment, deleteComment } from '../../slices/agreementsSlice';
import './Agreements.css';
import { jwtDecode } from 'jwt-decode';
import { isAdmin } from '../../utils/auth';

const Agreements = () => {
    const dispatch = useDispatch();
    const { agreements, loading: loadingAgreements, error } = useSelector(state => state.agreements);
    const { user } = useSelector(state => state.user);
    const hasFetchedRef = useRef(false);
    const [showAgreementModal, setShowAgreementModal] = useState(false);
    const [newAgreement, setNewAgreement] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pendiente'
    });
    const [editingAgreementId, setEditingAgreementId] = useState(null);
    const [editAgreementForm, setEditAgreementForm] = useState({});
    const [commentText, setCommentText] = useState({});
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingComment, setEditingComment] = useState({});
    const [editCommentText, setEditCommentText] = useState({});

    useEffect(() => {
        if (!hasFetchedRef.current) {
            console.log('Initial fetch of agreements');
            dispatch(fetchAgreements())
                .unwrap()
                .then(() => {
                    console.log('Agreements fetched successfully');
                })
                .catch((error) => {
                    console.error('Error fetching agreements:', error);
                });
            hasFetchedRef.current = true;
        }
    }, [dispatch]);

    const handleAgreementSubmit = async (e) => {
        e.preventDefault();

        try {
            await dispatch(fetchAgreements()).unwrap();
            setShowAgreementModal(false);
            setNewAgreement({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                status: 'pendiente'
            });
        } catch (error) {
            console.error('Error al crear el acuerdo:', error);
        }
    };

    // Utilidad para comparar solo año, mes y día en local time
    const isSameDay = (dateA, dateB) => {
        const a = new Date(dateA);
        const b = new Date(dateB);
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    };

    const today = new Date();
    // Si no hay filtros, mostrar solo acuerdos del día
    // Si hay filtros, mostrar los que correspondan al filtro
    const showFiltered = !!dateFilter || !!statusFilter;
    const filtered = showFiltered
        ? agreements.filter(agreement => {
            const matchesDate = !dateFilter || new Date(agreement.date).toISOString().split('T')[0] === dateFilter;
            const matchesStatus = !statusFilter || agreement.status === statusFilter;
            return matchesDate && matchesStatus;
        })
        : agreements.filter(agreement => isSameDay(agreement.date, today));

    // Log en cada render para depuración
    console.log('[RENDER] loadingAgreements:', loadingAgreements);
    console.log('[RENDER] agreements:', agreements);
    console.log('[RENDER] filtered:', filtered);
    console.log('[RENDER] error:', error);

    if (loadingAgreements) {
        return <div className="text-center p-4">Cargando acuerdos...</div>;
    }

    if (error) {
        return (
            <div className="alert alert-danger m-3">
                <h5>Error al cargar los acuerdos</h5>
                <p>{error}</p>
                <Button
                    variant="outline-danger"
                    onClick={() => {
                        hasFetchedRef.current = false;
                        dispatch(fetchAgreements());
                    }}
                >
                    Reintentar
                </Button>
            </div>
        );
    }

    const getUserName = () => {
        if (user?.name) return user.name;
        // Intentar decodificar el token si existe
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = jwtDecode(token);
                return payload.name || 'Usuario';
            } catch {
                return 'Usuario';
            }
        }
        return 'Usuario';
    };

    const handleAddComment = async (agreementId) => {
        if (!commentText[agreementId]) return;

        const newComment = {
            text: commentText[agreementId],
            author: getUserName(),
            date: new Date()
        };

        try {
            await dispatch(addComment({ agreementId, comment: newComment })).unwrap();
            setCommentText(t => ({ ...t, [agreementId]: '' }));
        } catch (error) {
            console.error('Error al agregar comentario:', error);
        }
    };

    const handleEditComment = async (agreementId, commentId, comment) => {
        try {
            await dispatch(editComment({ agreementId, commentId, comment })).unwrap();
            setEditingComment(ec => ({ ...ec, [agreementId]: undefined }));
            setEditCommentText(et => ({ ...et, [agreementId]: '' }));
        } catch (error) {
            console.error('Error al editar comentario:', error);
        }
    };

    const handleDeleteComment = async (agreementId, commentId) => {
        try {
            await dispatch(deleteComment({ agreementId, commentId })).unwrap();
        } catch (error) {
            console.error('Error al eliminar comentario:', error);
        }
    };

    return (
        <div className="agreements-section">
            <div className="agreements-header d-flex justify-content-between align-items-center">
                <h4>Acuerdos del Gabinete</h4>
                {isAdmin(user) && (
                    <Button variant="primary" onClick={() => setShowAgreementModal(true)}>
                        Nuevo Acuerdo
                    </Button>
                )}
            </div>

            {/* Filtros */}
            <div className="agreements-filters">
                <Row>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Filtrar por fecha</Form.Label>
                            <Form.Control
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Filtrar por estado</Form.Label>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Todos los estados</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="en_progreso">En progreso</option>
                                <option value="completado">Completado</option>
                                <option value="cancelado">Cancelado</option>
                                <option value="informacion">Información</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>

            {/* Modal para nuevo acuerdo */}
            <Modal show={showAgreementModal} onHide={() => setShowAgreementModal(false)} className="agreement-modal">
                <Modal.Header closeButton>
                    <Modal.Title className='text-white'>Nuevo Acuerdo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAgreementSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                value={newAgreement.title}
                                onChange={(e) => setNewAgreement({ ...newAgreement, title: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={newAgreement.description}
                                onChange={(e) => setNewAgreement({ ...newAgreement, description: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Fecha</Form.Label>
                            <Form.Control
                                type="date"
                                value={newAgreement.date}
                                onChange={(e) => setNewAgreement({ ...newAgreement, date: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Estado</Form.Label>
                            <Form.Select
                                value={newAgreement.status}
                                onChange={(e) => setNewAgreement({ ...newAgreement, status: e.target.value })}
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="en_progreso">En progreso</option>
                                <option value="completado">Completado</option>
                                <option value="cancelado">Cancelado</option>
                                <option value="informacion">Información</option>
                            </Form.Select>
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Crear Acuerdo
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Renderizar acuerdos (del día o filtrados) */}
            <div style={{ marginTop: 32 }}>
                <div className="agreement-section-title">
                    <span className="badge bg-primary agreement-section-date">
                        {showFiltered
                            ? dateFilter
                                ? new Date(dateFilter + 'T00:00:00').toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })
                                : 'Resultados de la búsqueda'
                            : today.toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                    </span>
                    <span className="agreement-section-label">{showFiltered ? 'Acuerdos filtrados' : 'Acuerdos del día'}</span>
                </div>
                <Row>
                    {filtered.length === 0 ? (
                        <Col xs={12}><p>No hay acuerdos para mostrar.</p></Col>
                    ) : (
                        filtered.map(agreement => (
                            <Col key={agreement._id} xs={12} className="mb-3">
                                <Card className="agreement-card">
                                    <Card.Body>
                                        <div className="agreement-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div className="agreement-title">
                                                {editingAgreementId === agreement._id ? (
                                                    <input
                                                        value={editAgreementForm.title || ''}
                                                        onChange={e => setEditAgreementForm(f => ({ ...f, title: e.target.value }))}
                                                        className="form-control"
                                                    />
                                                ) : (
                                                    agreement.title
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                                <span className="agreement-date-badge" style={{ marginBottom: 4 }}>
                                                    {new Date(agreement.date).toLocaleDateString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className={`agreement-status-badge badge-sm ${agreement.status}`}>
                                                    {agreement.status === 'completado' ? 'Completado' :
                                                        agreement.status === 'en_progreso' ? 'En progreso' :
                                                            agreement.status === 'cancelado' ? 'Cancelado' :
                                                                agreement.status === 'informacion' ? 'Información' :
                                                                    'Pendiente'}
                                                </span>
                                            </div>
                                        </div>
                                        {editingAgreementId === agreement._id ? (
                                            <>
                                                <textarea
                                                    value={editAgreementForm.description || ''}
                                                    onChange={e => setEditAgreementForm(f => ({ ...f, description: e.target.value }))}
                                                    className="form-control mb-3"
                                                    rows={3}
                                                />
                                                <div className="agreement-actions">
                                                    <Button size="sm" variant="success" onClick={async () => {
                                                        await dispatch(fetchAgreements()).unwrap();
                                                        setEditingAgreementId(null);
                                                    }}>Guardar</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => setEditingAgreementId(null)}>Cancelar</Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="agreement-description">{agreement.description}</div>
                                                <div className="agreement-actions">
                                                    {isAdmin(user) && (
                                                        <>
                                                            <Button size="sm" variant="outline-primary" onClick={() => {
                                                                setEditingAgreementId(agreement._id);
                                                                setEditAgreementForm({
                                                                    title: agreement.title,
                                                                    description: agreement.description,
                                                                    date: agreement.date ? new Date(agreement.date).toISOString().slice(0, 10) : '',
                                                                    status: agreement.status
                                                                });
                                                            }}>Editar</Button>
                                                            <Button size="sm" variant="outline-danger" onClick={async () => {
                                                                await dispatch(fetchAgreements()).unwrap();
                                                            }}>Eliminar</Button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {/* Comentarios de seguimiento */}
                                        <div className="agreement-comments">
                                            <div className="agreement-comments-title">Seguimiento</div>
                                            <div>
                                                {(agreement.comments || []).map((c, idx) => (
                                                    <div key={idx} className="agreement-comment">
                                                        <div className="agreement-comment-content">
                                                            <div className="agreement-comment-author">{c.author || 'Anónimo'}</div>
                                                            <div className="agreement-comment-text">{c.text}</div>
                                                            <div className="agreement-comment-date">{c.date ? new Date(c.date).toLocaleString() : ''}</div>
                                                        </div>
                                                        <div className="agreement-comment-actions">
                                                            {editingComment[agreement._id] === idx ? (
                                                                <>
                                                                    <input
                                                                        type="text"
                                                                        value={editCommentText[agreement._id] || ''}
                                                                        onChange={e => setEditCommentText(t => ({ ...t, [agreement._id]: e.target.value }))}
                                                                        className="form-control"
                                                                        style={{ flex: 1 }}
                                                                    />
                                                                    <Button size="sm" variant="success" onClick={async () => {
                                                                        await handleEditComment(agreement._id, idx, { ...c, text: editCommentText[agreement._id] });
                                                                    }}>Guardar</Button>
                                                                    <Button size="sm" variant="secondary" onClick={() => {
                                                                        setEditingComment(ec => ({ ...ec, [agreement._id]: undefined }));
                                                                        setEditCommentText(et => ({ ...et, [agreement._id]: '' }));
                                                                    }}>Cancelar</Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="outline-primary" onClick={() => {
                                                                        setEditingComment(ec => ({ ...ec, [agreement._id]: idx }));
                                                                        setEditCommentText(et => ({ ...et, [agreement._id]: c.text }));
                                                                    }}>Editar</Button>
                                                                    <Button size="sm" variant="outline-danger" onClick={async () => {
                                                                        await handleDeleteComment(agreement._id, idx);
                                                                    }}>Eliminar</Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="agreement-comment-input">
                                                <input
                                                    type="text"
                                                    placeholder="Escribe un comentario..."
                                                    value={commentText[agreement._id] || ''}
                                                    onChange={e => setCommentText(t => ({ ...t, [agreement._id]: e.target.value }))}
                                                />
                                                <Button size="sm" variant="primary" onClick={() => handleAddComment(agreement._id)}>
                                                    Comentar
                                                </Button>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))
                    )}
                </Row>
            </div>
        </div>
    );
};

export default Agreements; 