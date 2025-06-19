import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Modal, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgreements, addComment, editComment, deleteComment, editAgreement, removeAgreement } from '../../slices/agreementsSlice';
import { createAgreementsBulk } from '../../services/agreements';
import './Agreements.css';
import { jwtDecode } from 'jwt-decode';
import { isAdmin } from '../../utils/auth';
import * as XLSX from 'xlsx';

const Agreements = () => {
    const dispatch = useDispatch();
    const { agreements, loading: loadingAgreements, error } = useSelector(state => state.agreements);
    const { user } = useSelector(state => state.user);
    const hasFetchedRef = useRef(false);
    const [showAgreementModal, setShowAgreementModal] = useState(false);
    const [agreementsList, setAgreementsList] = useState([{
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pendiente',
        responsible: '',
        dueDate: new Date().toISOString().split('T')[0]
    }]);
    const [agreementError, setAgreementError] = useState('');
    const [editingAgreementId, setEditingAgreementId] = useState(null);
    const [editAgreementForm, setEditAgreementForm] = useState({});
    const [commentText, setCommentText] = useState({});
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingComment, setEditingComment] = useState({});
    const [editCommentText, setEditCommentText] = useState({});
    const [showAllAgreements, setShowAllAgreements] = useState(false);
    const [allStatusFilter, setAllStatusFilter] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState({ from: '', to: '' });
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (!hasFetchedRef.current) {
            dispatch(fetchAgreements())
                .unwrap()
                .then(() => {
                    // Agreements fetched successfully
                })
                .catch((error) => {
                    console.error('Error fetching agreements:', error);
                });
            hasFetchedRef.current = true;
        }
    }, [dispatch]);

    const addNewAgreementForm = () => {
        setAgreementsList([...agreementsList, {
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            status: 'pendiente',
            responsible: '',
            dueDate: new Date().toISOString().split('T')[0]
        }]);
    };

    const removeAgreementForm = (index) => {
        const newList = agreementsList.filter((_, i) => i !== index);
        setAgreementsList(newList);
    };

    const updateAgreementForm = (index, field, value) => {
        const newList = [...agreementsList];
        newList[index] = { ...newList[index], [field]: value };
        setAgreementsList(newList);
    };

    const validateAgreement = (agreement) => {
        const errors = {};
        if (!agreement.title.trim()) errors.title = 'El título es requerido';
        if (!agreement.description.trim()) errors.description = 'La descripción es requerida';
        if (!agreement.responsible.trim()) errors.responsible = 'El responsable es requerido';
        if (!agreement.dueDate) errors.dueDate = 'La fecha de entrega es requerida';
        if (!agreement.date) errors.date = 'La fecha de la minuta es requerida';
        return errors;
    };

    const handleAgreementSubmit = async (e) => {
        e.preventDefault();
        setAgreementError('');
        setValidationErrors({});
        setIsSubmitting(true);

        try {
            // Validar todos los acuerdos
            const errors = {};
            agreementsList.forEach((agreement, index) => {
                const agreementErrors = validateAgreement(agreement);
                if (Object.keys(agreementErrors).length > 0) {
                    errors[index] = agreementErrors;
                }
            });

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setIsSubmitting(false);
                return;
            }

            await createAgreementsBulk(agreementsList);
            await dispatch(fetchAgreements()).unwrap();
            setShowAgreementModal(false);
            setAgreementsList([{
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                status: 'pendiente',
                responsible: '',
                dueDate: new Date().toISOString().split('T')[0]
            }]);
        } catch (error) {
            console.error('Error al crear los acuerdos:', error);
            setAgreementError(error.response?.data?.message || error.message || 'Error al crear los acuerdos');
        } finally {
            setIsSubmitting(false);
        }
    };

    const today = new Date();
    const showFiltered = !!dateFilter || !!statusFilter;
    const filtered = showFiltered
        ? agreements.filter(agreement => {
            const matchesDate = !dateFilter ||
                (agreement.date && agreement.date.slice(0, 10) === dateFilter);
            const matchesStatus = !statusFilter || agreement.status === statusFilter;
            return matchesDate && matchesStatus;
        })
        : agreements.filter(agreement => {
            const agreementDate = new Date(agreement.date);
            return (
                agreementDate.getFullYear() === today.getFullYear() &&
                agreementDate.getMonth() === today.getMonth() &&
                agreementDate.getDate() === today.getDate()
            );
        });

    // Todos los acuerdos (ordenados y filtrados por estado si aplica)
    const allAgreementsFiltered = agreements
        .slice()
        .filter(agreement => {
            const matchesStatus = allStatusFilter.length === 0 || allStatusFilter.includes(agreement.status);

            // Lógica mejorada para el filtro de búsqueda
            let matchesSearch = !searchFilter;
            if (searchFilter) {
                const searchLower = searchFilter.toLowerCase();
                const titleMatch = agreement.title.toLowerCase().includes(searchLower);
                const descriptionMatch = agreement.description.toLowerCase().includes(searchLower);
                const dueDateMatch = agreement.dueDate && new Date(agreement.dueDate).toLocaleDateString('es-MX').toLowerCase().includes(searchLower);

                // Lógica especial para responsables
                let responsibleMatch = false;
                if (agreement.responsible) {
                    const responsibleLower = agreement.responsible.toLowerCase();

                    // Si buscas "Todos", incluir todos los acuerdos
                    if (searchLower === 'todos') {
                        responsibleMatch = true;
                    }
                    // Si el responsable del acuerdo es "Todos", siempre incluir (sin importar qué busques)
                    else if (responsibleLower === 'todos') {
                        responsibleMatch = true;
                    }
                    // Si buscas un responsable específico, incluir si coincide exactamente
                    else if (responsibleLower.includes(searchLower)) {
                        responsibleMatch = true;
                    }
                }

                matchesSearch = titleMatch || descriptionMatch || responsibleMatch || dueDateMatch;

                // Debug temporal para verificar el filtro
                if (searchFilter.toLowerCase() === 'rjdg' && agreement.responsible) {
                    console.log('🔍 Evaluando acuerdo:', {
                        title: agreement.title,
                        responsible: agreement.responsible,
                        responsibleLower: agreement.responsible.toLowerCase(),
                        searchLower: searchLower,
                        responsibleMatch: responsibleMatch,
                        matchesSearch: matchesSearch
                    });
                }
            }

            const matchesDate = (!dateRangeFilter.from || new Date(agreement.date) >= new Date(dateRangeFilter.from)) &&
                (!dateRangeFilter.to || new Date(agreement.date) <= new Date(dateRangeFilter.to));
            const matchesResponsible = !responsibleFilter ||
                (agreement.responsible && agreement.responsible.toLowerCase().includes(responsibleFilter.toLowerCase()));

            return matchesStatus && matchesSearch && matchesDate && matchesResponsible;
        })
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

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
            // Error adding comment
        }
    };

    const handleEditComment = async (agreementId, commentId, comment) => {
        try {
            await dispatch(editComment({ agreementId, commentId, comment })).unwrap();
            setEditingComment(ec => ({ ...ec, [agreementId]: undefined }));
            setEditCommentText(et => ({ ...et, [agreementId]: '' }));
        } catch (error) {
            // Error editing comment
        }
    };

    const handleDeleteComment = async (agreementId, commentId) => {
        try {
            await dispatch(deleteComment({ agreementId, commentId })).unwrap();
        } catch (error) {
            // Error deleting comment
        }
    };

    // Handler para guardar edición de acuerdo
    const handleSaveEditAgreement = async (agreementId) => {
        try {
            await dispatch(editAgreement({ id: agreementId, data: editAgreementForm })).unwrap();
            await dispatch(fetchAgreements()).unwrap();
            setEditingAgreementId(null);
        } catch (error) {
            alert('Error al editar el acuerdo: ' + (error.message || error));
        }
    };

    // Handler para eliminar acuerdo
    const handleDeleteAgreement = async (agreementId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este acuerdo?')) return;
        try {
            await dispatch(removeAgreement(agreementId)).unwrap();
            await dispatch(fetchAgreements()).unwrap();
        } catch (error) {
            alert('Error al eliminar el acuerdo: ' + (error.message || error));
        }
    };

    // Función para generar el reporte Excel de todos los acuerdos filtrados
    const handleExportAllAgreementsExcel = () => {
        if (allAgreementsFiltered.length === 0) {
            alert('No hay acuerdos para exportar.');
            return;
        }
        const data = [
            ['Fecha', 'Título', 'Estado', 'Descripción', 'Responsable', 'Fecha de entrega', 'Seguimiento']
        ];
        allAgreementsFiltered.forEach(agreement => {
            // Formatear comentarios para la columna de seguimiento
            let seguimiento = '';
            if (agreement.comments && agreement.comments.length > 0) {
                seguimiento = agreement.comments.map(comment => {
                    const fecha = comment.date ? new Date(comment.date).toLocaleDateString('es-MX') : 'Sin fecha';
                    return `${fecha} - ${comment.author}: ${comment.text}`;
                }).join('\n');
            }

            data.push([
                agreement.date ? new Date(agreement.date).toLocaleDateString('es-MX') : '',
                agreement.title || '',
                agreement.status || '',
                agreement.description || '',
                agreement.responsible || '',
                agreement.dueDate ? new Date(agreement.dueDate).toLocaleDateString('es-MX') : '',
                seguimiento
            ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Acuerdos');

        // Crear nombre de archivo más descriptivo
        let fileName = 'Reporte_Acuerdos';

        // Agregar filtros aplicados al nombre del archivo
        if (allStatusFilter.length > 0) {
            fileName += `_Estados_${allStatusFilter.join('_')}`;
        }

        if (searchFilter) {
            fileName += `_Busqueda_${searchFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }

        if (responsibleFilter) {
            fileName += `_Responsable_${responsibleFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }

        if (dateRangeFilter.from || dateRangeFilter.to) {
            const fromDate = dateRangeFilter.from ? new Date(dateRangeFilter.from).toISOString().split('T')[0] : 'inicio';
            const toDate = dateRangeFilter.to ? new Date(dateRangeFilter.to).toISOString().split('T')[0] : 'fin';
            fileName += `_Fecha_${fromDate}_a_${toDate}`;
        }

        fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const getDueDateStatus = (dueDate, status) => {
        if (status === 'completado') return 'completed';

        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 3) return 'upcoming';
        return '';
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
                                className="date-filter-black"
                                style={{ color: 'black' }}
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
            <Modal show={showAgreementModal} onHide={() => {
                setShowAgreementModal(false);
                setAgreementError('');
            }} className="agreement-modal">
                <Modal.Header closeButton className="text-center">
                    <Modal.Title className='custom-modal-title'>Nuevo Acuerdo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {agreementError && (
                        <div className="alert alert-danger mb-3">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {agreementError}
                        </div>
                    )}
                    <Form onSubmit={handleAgreementSubmit}>
                        {agreementsList.map((agreement, index) => (
                            <div key={index} className="agreement-form-container mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0">Acuerdo {index + 1}</h6>
                                    {index > 0 && (
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => removeAgreementForm(index)}
                                            disabled={isSubmitting}
                                        >
                                            <i className="fas fa-trash-alt me-1"></i>
                                            Eliminar
                                        </Button>
                                    )}
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Título
                                        {validationErrors[index]?.title && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].title}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={agreement.title}
                                        onChange={(e) => updateAgreementForm(index, 'title', e.target.value)}
                                        required
                                        isInvalid={!!validationErrors[index]?.title}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Descripción
                                        {validationErrors[index]?.description && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].description}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={agreement.description}
                                        onChange={(e) => updateAgreementForm(index, 'description', e.target.value)}
                                        required
                                        isInvalid={!!validationErrors[index]?.description}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Estado
                                        {validationErrors[index]?.status && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].status}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Select
                                        value={agreement.status}
                                        onChange={(e) => updateAgreementForm(index, 'status', e.target.value)}
                                        isInvalid={!!validationErrors[index]?.status}
                                        disabled={isSubmitting}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_progreso">En progreso</option>
                                        <option value="completado">Completado</option>
                                        <option value="cancelado">Cancelado</option>
                                        <option value="informacion">Información</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Fecha de entrega
                                        {validationErrors[index]?.dueDate && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].dueDate}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={agreement.dueDate}
                                        onChange={(e) => updateAgreementForm(index, 'dueDate', e.target.value)}
                                        required
                                        className="date-filter-black"
                                        isInvalid={!!validationErrors[index]?.dueDate}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Responsable
                                        {validationErrors[index]?.responsible && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].responsible}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={agreement.responsible}
                                        onChange={(e) => updateAgreementForm(index, 'responsible', e.target.value)}
                                        required
                                        isInvalid={!!validationErrors[index]?.responsible}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Fecha de la minuta
                                        {validationErrors[index]?.date && (
                                            <span className="text-danger ms-2">
                                                <i className="fas fa-exclamation-circle"></i>
                                                {validationErrors[index].date}
                                            </span>
                                        )}
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={agreement.date}
                                        onChange={(e) => updateAgreementForm(index, 'date', e.target.value)}
                                        required
                                        className="date-filter-black"
                                        isInvalid={!!validationErrors[index]?.date}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                            </div>
                        ))}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button
                                variant="outline-primary"
                                onClick={addNewAgreementForm}
                                type="button"
                                disabled={isSubmitting}
                            >
                                <i className="fas fa-plus me-1"></i>
                                Agregar otro acuerdo
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                className="px-4"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Creando acuerdos...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save me-2"></i>
                                        Crear Acuerdos
                                    </>
                                )}
                            </Button>
                        </div>
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
                                        <div className="agreement-details mb-3">
                                            <div className="agreement-responsible">
                                                <strong>Responsable:</strong> {agreement.responsible}
                                            </div>
                                            <div className="agreement-due-date">
                                                <strong>Fecha de entrega:</strong>
                                                <span className={getDueDateStatus(agreement.dueDate, agreement.status)}>
                                                    {new Date(agreement.dueDate).toLocaleDateString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
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
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <Form.Group>
                                                            <Form.Label>Responsable</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                value={editAgreementForm.responsible || ''}
                                                                onChange={e => {
                                                                    setEditAgreementForm(f => ({ ...f, responsible: e.target.value }));
                                                                }}
                                                                required
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <Form.Group>
                                                            <Form.Label>Fecha de entrega</Form.Label>
                                                            <Form.Control
                                                                type="date"
                                                                value={editAgreementForm.dueDate ? new Date(editAgreementForm.dueDate).toISOString().split('T')[0] : ''}
                                                                onChange={e => setEditAgreementForm(f => ({ ...f, dueDate: e.target.value }))}
                                                                required
                                                                className="date-filter-black"
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                </div>
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <Form.Group>
                                                            <Form.Label>Fecha de la minuta</Form.Label>
                                                            <Form.Control
                                                                type="date"
                                                                value={editAgreementForm.date ? new Date(editAgreementForm.date).toISOString().split('T')[0] : ''}
                                                                onChange={e => setEditAgreementForm(f => ({ ...f, date: e.target.value }))}
                                                                required
                                                                className="date-filter-black"
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <Form.Group>
                                                            <Form.Label>Estado</Form.Label>
                                                            <Form.Select
                                                                value={editAgreementForm.status || 'pendiente'}
                                                                onChange={e => setEditAgreementForm(f => ({ ...f, status: e.target.value }))}
                                                            >
                                                                <option value="pendiente">Pendiente</option>
                                                                <option value="en_progreso">En progreso</option>
                                                                <option value="completado">Completado</option>
                                                                <option value="cancelado">Cancelado</option>
                                                                <option value="informacion">Información</option>
                                                            </Form.Select>
                                                        </Form.Group>
                                                    </div>
                                                </div>
                                                <div className="agreement-actions">
                                                    <Button size="sm" variant="success" onClick={() => handleSaveEditAgreement(agreement._id)}>Guardar</Button>
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
                                                                    title: agreement.title || '',
                                                                    description: agreement.description || '',
                                                                    date: agreement.date ? new Date(agreement.date).toISOString().slice(0, 10) : '',
                                                                    status: agreement.status || 'pendiente',
                                                                    responsible: agreement.responsible || '',
                                                                    dueDate: agreement.dueDate ? new Date(agreement.dueDate).toISOString().slice(0, 10) : ''
                                                                });
                                                            }}>Editar</Button>
                                                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteAgreement(agreement._id)}>Eliminar</Button>
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
                {/* Botón para mostrar todos los acuerdos */}
                {!showAllAgreements && (
                    <div className="text-center mt-4">
                        <Button variant="outline-primary" onClick={() => setShowAllAgreements(true)}>
                            Mostrar todos los acuerdos
                        </Button>
                    </div>
                )}
            </div>
            {/* Sección de todos los acuerdos */}
            {showAllAgreements && (
                <div className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Todos los acuerdos</h5>
                        <Button variant="outline-secondary" onClick={() => setShowAllAgreements(false)}>
                            Ocultar todos los acuerdos
                        </Button>
                    </div>
                    <div className="styled-filters mb-3">
                        <div className="filters-row">
                            <div className="filter-group" style={{ minWidth: '100%', maxWidth: '100%' }}>
                                <Row>
                                    <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                                        <Form.Label className="agreement-filter-title">Filtrar por estado</Form.Label>
                                        <Form.Select
                                            value={allStatusFilter.length > 0 ? allStatusFilter[0] : ''}
                                            onChange={(e) => {
                                                const selectedValue = e.target.value;
                                                if (selectedValue === '') {
                                                    setAllStatusFilter([]);
                                                } else if (allStatusFilter.includes(selectedValue)) {
                                                    setAllStatusFilter(prev => prev.filter(s => s !== selectedValue));
                                                } else {
                                                    setAllStatusFilter(prev => [...prev, selectedValue]);
                                                }
                                            }}
                                            className="filter-field w-100"
                                        >
                                            <option value="">Todos los estados</option>
                                            <option value="pendiente">Pendiente</option>
                                            <option value="en_progreso">En progreso</option>
                                            <option value="completado">Completado</option>
                                            <option value="cancelado">Cancelado</option>
                                            <option value="informacion">Información</option>
                                        </Form.Select>
                                        {allStatusFilter.length > 0 && (
                                            <div className="selected-statuses mt-2">
                                                <small className="text-muted">Estados seleccionados:</small>
                                                <div className="status-tags">
                                                    {allStatusFilter.map(status => (
                                                        <span
                                                            key={status}
                                                            className="status-tag"
                                                            onClick={() => setAllStatusFilter(prev => prev.filter(s => s !== status))}
                                                        >
                                                            {status === 'completado' ? 'Completado' :
                                                                status === 'en_progreso' ? 'En progreso' :
                                                                    status === 'cancelado' ? 'Cancelado' :
                                                                        status === 'informacion' ? 'Información' :
                                                                            'Pendiente'}
                                                            <i className="fas fa-times ms-1"></i>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Col>
                                    <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                                        <Form.Label className="agreement-filter-title">Ordenar por fecha</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Button
                                                variant={sortOrder === 'newest' ? 'primary' : 'outline-primary'}
                                                size="sm"
                                                onClick={() => setSortOrder('newest')}
                                                className="w-100"
                                            >
                                                <i className="fas fa-arrow-down me-1"></i>
                                                Recientes
                                            </Button>
                                            <Button
                                                variant={sortOrder === 'oldest' ? 'primary' : 'outline-primary'}
                                                size="sm"
                                                onClick={() => setSortOrder('oldest')}
                                                className="w-100"
                                            >
                                                <i className="fas fa-arrow-up me-1"></i>
                                                Antiguos
                                            </Button>
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                                        <Form.Label className="agreement-filter-title">Filtrar por responsable</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Nombre del responsable..."
                                            value={responsibleFilter}
                                            onChange={(e) => setResponsibleFilter(e.target.value)}
                                            className="filter-field w-100"
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                                        <Form.Label className="agreement-filter-title">Rango de fechas</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="date"
                                                value={dateRangeFilter.from}
                                                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, from: e.target.value }))}
                                                className="date-filter-black filter-field w-100"
                                            />
                                            <Form.Control
                                                type="date"
                                                value={dateRangeFilter.to}
                                                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, to: e.target.value }))}
                                                className="date-filter-black filter-field w-100"
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                        <div className="search-filter mt-3">
                            <Form.Control
                                type="text"
                                placeholder="Buscar por título, descripción, responsable o fecha de entrega..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="filter-field w-100"
                            />
                        </div>
                        <div className="d-flex justify-content-center mt-3">
                            <Button variant="success" className="report-button" onClick={handleExportAllAgreementsExcel}>
                                <i className="fas fa-file-excel me-2"></i>
                                Generar Excel
                            </Button>
                        </div>
                    </div>
                    <Row>
                        {allAgreementsFiltered.length === 0 ? (
                            <Col xs={12}><p>No hay acuerdos para mostrar.</p></Col>
                        ) : (
                            allAgreementsFiltered.map(agreement => (
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
                                            <div className="agreement-details mb-3">
                                                <div className="agreement-responsible">
                                                    <strong>Responsable:</strong> {agreement.responsible}
                                                </div>
                                                <div className="agreement-due-date">
                                                    <strong>Fecha de entrega:</strong>
                                                    <span className={getDueDateStatus(agreement.dueDate, agreement.status)}>
                                                        {new Date(agreement.dueDate).toLocaleDateString('es-MX', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
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
                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <Form.Group>
                                                                <Form.Label>Responsable</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    value={editAgreementForm.responsible || ''}
                                                                    onChange={e => {
                                                                        setEditAgreementForm(f => ({ ...f, responsible: e.target.value }));
                                                                    }}
                                                                    required
                                                                />
                                                            </Form.Group>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <Form.Group>
                                                                <Form.Label>Fecha de entrega</Form.Label>
                                                                <Form.Control
                                                                    type="date"
                                                                    value={editAgreementForm.dueDate ? new Date(editAgreementForm.dueDate).toISOString().split('T')[0] : ''}
                                                                    onChange={e => setEditAgreementForm(f => ({ ...f, dueDate: e.target.value }))}
                                                                    required
                                                                    className="date-filter-black"
                                                                />
                                                            </Form.Group>
                                                        </div>
                                                    </div>
                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <Form.Group>
                                                                <Form.Label>Fecha de la minuta</Form.Label>
                                                                <Form.Control
                                                                    type="date"
                                                                    value={editAgreementForm.date ? new Date(editAgreementForm.date).toISOString().split('T')[0] : ''}
                                                                    onChange={e => setEditAgreementForm(f => ({ ...f, date: e.target.value }))}
                                                                    required
                                                                    className="date-filter-black"
                                                                />
                                                            </Form.Group>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <Form.Group>
                                                                <Form.Label>Estado</Form.Label>
                                                                <Form.Select
                                                                    value={editAgreementForm.status || 'pendiente'}
                                                                    onChange={e => setEditAgreementForm(f => ({ ...f, status: e.target.value }))}
                                                                >
                                                                    <option value="pendiente">Pendiente</option>
                                                                    <option value="en_progreso">En progreso</option>
                                                                    <option value="completado">Completado</option>
                                                                    <option value="cancelado">Cancelado</option>
                                                                    <option value="informacion">Información</option>
                                                                </Form.Select>
                                                            </Form.Group>
                                                        </div>
                                                    </div>
                                                    <div className="agreement-actions">
                                                        <Button size="sm" variant="success" onClick={() => handleSaveEditAgreement(agreement._id)}>Guardar</Button>
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
                                                                        title: agreement.title || '',
                                                                        description: agreement.description || '',
                                                                        date: agreement.date ? new Date(agreement.date).toISOString().slice(0, 10) : '',
                                                                        status: agreement.status || 'pendiente',
                                                                        responsible: agreement.responsible || '',
                                                                        dueDate: agreement.dueDate ? new Date(agreement.dueDate).toISOString().slice(0, 10) : ''
                                                                    });
                                                                }}>Editar</Button>
                                                                <Button size="sm" variant="outline-danger" onClick={() => handleDeleteAgreement(agreement._id)}>Eliminar</Button>
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
            )}
        </div>
    );
};

export default Agreements; 