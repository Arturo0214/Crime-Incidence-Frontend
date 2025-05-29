import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchInstructions,
    createInstruction,
    updateInstructionStatus,
    addInstructionComment,
    deleteInstruction,
    editInstructionComment,
    removeInstructionComment
} from '../../slices/instructionsSlice';
import { isAdmin } from '../../utils/auth';
import { jwtDecode } from 'jwt-decode';
import './SpecialInstructions.css';

const STATUS_OPTIONS = ['designado', 'en proceso', 'en seguimiento', 'atendido'];

const SpecialInstructions = () => {
    const dispatch = useDispatch();
    const { instructions, loading, error } = useSelector(state => state.instructions);
    const { user } = useSelector(state => state.user);
    const [newInstruction, setNewInstruction] = useState({ title: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [commentText, setCommentText] = useState({});
    const [statusUpdating, setStatusUpdating] = useState({});
    const [editingComment, setEditingComment] = useState({});
    const [editCommentText, setEditCommentText] = useState({});

    useEffect(() => {
        dispatch(fetchInstructions());
    }, [dispatch]);

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
        return 'Usuario';
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await dispatch(createInstruction(newInstruction)).unwrap();
            setNewInstruction({ title: '', description: '' });
            dispatch(fetchInstructions());
        } catch (err) { }
        setCreating(false);
    };

    const handleStatusChange = async (id, status) => {
        setStatusUpdating(s => ({ ...s, [id]: true }));
        try {
            await dispatch(updateInstructionStatus({ id, status })).unwrap();
            dispatch(fetchInstructions());
        } catch (err) { }
        setStatusUpdating(s => ({ ...s, [id]: false }));
    };

    const handleAddComment = async (id) => {
        if (!commentText[id]) return;
        try {
            await dispatch(addInstructionComment({ id, text: commentText[id], author: getUserName() })).unwrap();
            setCommentText(t => ({ ...t, [id]: '' }));
            dispatch(fetchInstructions());
        } catch (err) { }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar consigna?')) return;
        try {
            await dispatch(deleteInstruction(id)).unwrap();
            dispatch(fetchInstructions());
        } catch (err) { }
    };

    const handleEditComment = async (id, commentIdx) => {
        try {
            await dispatch(editInstructionComment({ id, commentIdx, text: editCommentText[`${id}_${commentIdx}`] })).unwrap();
            setEditingComment(ec => ({ ...ec, [`${id}_${commentIdx}`]: false }));
            setEditCommentText(et => ({ ...et, [`${id}_${commentIdx}`]: '' }));
            dispatch(fetchInstructions());
        } catch (err) { }
    };

    const handleDeleteComment = async (id, commentIdx) => {
        try {
            await dispatch(removeInstructionComment({ id, commentIdx })).unwrap();
            dispatch(fetchInstructions());
        } catch (err) { }
    };

    return (
        <div className="special-instructions-section" style={{ background: '#f8fafc', borderRadius: 10, padding: 24, marginBottom: 32 }}>
            <h4 style={{ fontWeight: 700, color: '#2563eb', marginBottom: 18 }}>Consignas Especiales</h4>
            {isAdmin(user) && (
                <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Título"
                        value={newInstruction.title}
                        onChange={e => setNewInstruction(n => ({ ...n, title: e.target.value }))}
                        required
                        style={{ flex: 1, minWidth: 120, padding: 6, borderRadius: 5, border: '1px solid #ccc' }}
                    />
                    <input
                        type="text"
                        placeholder="Descripción"
                        value={newInstruction.description}
                        onChange={e => setNewInstruction(n => ({ ...n, description: e.target.value }))}
                        required
                        style={{ flex: 2, minWidth: 180, padding: 6, borderRadius: 5, border: '1px solid #ccc' }}
                    />
                    <button type="submit" disabled={creating} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 18px', fontWeight: 600 }}>
                        {creating ? 'Creando...' : '+ Agregar'}
                    </button>
                </form>
            )}
            {loading ? <div>Cargando...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {instructions.map(inst => (
                        <div key={inst._id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #0001', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 17, color: '#222' }}>{inst.title}</div>
                                    <div style={{ color: '#555', fontSize: 15 }}>{inst.description}</div>
                                </div>
                                {isAdmin(user) && (
                                    <div className="si-header-actions">
                                        <select
                                            value={inst.status}
                                            onChange={e => handleStatusChange(inst._id, e.target.value)}
                                            disabled={statusUpdating[inst._id]}
                                            style={{ borderRadius: 5, padding: '4px 10px', fontWeight: 600, color: '#2563eb', border: '1px solid #2563eb', background: '#f0f6ff' }}
                                        >
                                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                                        </select>
                                        <button onClick={() => handleDelete(inst._id)} className="si-comment-delete-btn">Eliminar</button>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: 8, marginBottom: 4, fontSize: 14, color: '#888' }}>
                                Estado: <b style={{ color: '#2563eb' }}>{inst.status}</b> | Creado: {new Date(inst.createdAt).toLocaleString()}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <b style={{ color: '#1e3a8a' }}>Comentarios:</b>
                                <div style={{ marginTop: 4, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {inst.comments && inst.comments.length > 0 ? inst.comments.map((c, idx) => (
                                        <div key={idx} className="si-comment-row" style={{
                                            background: '#f4f8fb',
                                            borderRadius: 6,
                                            padding: '8px 14px',
                                            fontSize: 15,
                                            color: '#222',
                                            border: '1px solid #e3e8ee',
                                            marginBottom: 2
                                        }}>
                                            <span style={{ color: '#2563eb', fontWeight: 700, marginRight: 8 }}>{c.author}:</span>
                                            {editingComment[`${inst._id}_${idx}`] ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editCommentText[`${inst._id}_${idx}`] || c.text}
                                                        onChange={e => setEditCommentText(t => ({ ...t, [`${inst._id}_${idx}`]: e.target.value }))}
                                                        style={{ flex: 1, minWidth: 80, padding: 4, borderRadius: 5, border: '1px solid #ccc' }}
                                                    />
                                                    <button onClick={() => handleEditComment(inst._id, idx)} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontWeight: 600 }}>Guardar</button>
                                                    <button onClick={() => {
                                                        setEditingComment(ec => ({ ...ec, [`${inst._id}_${idx}`]: false }));
                                                        setEditCommentText(et => ({ ...et, [`${inst._id}_${idx}`]: '' }));
                                                    }} style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontWeight: 600 }}>Cancelar</button>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ flex: 1 }}>{c.text}</span>
                                                    <span style={{ color: '#888', fontSize: 12, marginLeft: 10, minWidth: 110, textAlign: 'right' }}>{new Date(c.date).toLocaleString()}</span>
                                                    {isAdmin(user) && (
                                                        <>
                                                            <button onClick={() => setEditingComment(ec => ({ ...ec, [`${inst._id}_${idx}`]: true }))} className="si-comment-edit-btn">Editar</button>
                                                            <button onClick={() => handleDeleteComment(inst._id, idx)} className="si-comment-delete-btn">Eliminar</button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )) : <span style={{ color: '#aaa', fontSize: 13 }}>Sin comentarios</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input
                                        type="text"
                                        placeholder="Comentario"
                                        value={commentText[inst._id] || ''}
                                        onChange={e => setCommentText(t => ({ ...t, [inst._id]: e.target.value }))}
                                        style={{ flex: 3, minWidth: 120, padding: 4, borderRadius: 5, border: '1px solid #ccc' }}
                                    />
                                    <button onClick={() => handleAddComment(inst._id)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 14px', fontWeight: 600 }}>
                                        Comentar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SpecialInstructions; 