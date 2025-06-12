import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getAgreements,
    addCommentToAgreement,
    editCommentInAgreement,
    deleteCommentFromAgreement,
    updateAgreement,
    deleteAgreement
} from '../services/agreements';

// Thunks
export const fetchAgreements = createAsyncThunk(
    'agreements/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const data = await getAgreements();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al cargar acuerdos');
        }
    }
);

export const addComment = createAsyncThunk(
    'agreements/addComment',
    async ({ agreementId, comment }, { rejectWithValue }) => {
        try {
            await addCommentToAgreement(agreementId, comment);
            return { agreementId, comment };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al agregar comentario');
        }
    }
);

export const editComment = createAsyncThunk(
    'agreements/editComment',
    async ({ agreementId, commentId, comment }, { rejectWithValue }) => {
        try {
            const data = await editCommentInAgreement(agreementId, commentId, comment);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al editar comentario');
        }
    }
);

export const deleteComment = createAsyncThunk(
    'agreements/deleteComment',
    async ({ agreementId, commentId }, { rejectWithValue }) => {
        try {
            const data = await deleteCommentFromAgreement(agreementId, commentId);
            return { agreementId, commentId, data };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al eliminar comentario');
        }
    }
);

export const editAgreement = createAsyncThunk(
    'agreements/editAgreement',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const result = await updateAgreement(id, data);
            return result;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al editar acuerdo');
        }
    }
);

export const removeAgreement = createAsyncThunk(
    'agreements/removeAgreement',
    async (id, { rejectWithValue }) => {
        try {
            await deleteAgreement(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al eliminar acuerdo');
        }
    }
);

const initialState = {
    agreements: [],
    loading: false,
    error: null
};

const agreementsSlice = createSlice({
    name: 'agreements',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Agreements
            .addCase(fetchAgreements.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAgreements.fulfilled, (state, action) => {
                state.loading = false;
                state.agreements = action.payload;
                state.error = null;
            })
            .addCase(fetchAgreements.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Error al cargar acuerdos';
            })
            // Add Comment
            .addCase(addComment.fulfilled, (state, action) => {
                const agreement = state.agreements.find(a => a._id === action.payload.agreementId);
                if (agreement) {
                    if (!agreement.comments) {
                        agreement.comments = [];
                    }
                    agreement.comments.push(action.payload.comment);
                }
            })
            // Edit Comment
            .addCase(editComment.fulfilled, (state, action) => {
                const agreement = state.agreements.find(a => a._id === action.payload._id);
                if (agreement) {
                    agreement.comments = action.payload.comments;
                }
            })
            // Delete Comment
            .addCase(deleteComment.fulfilled, (state, action) => {
                const agreement = state.agreements.find(a => a._id === action.payload.agreementId);
                if (agreement) {
                    if (action.payload.data?.comments) {
                        agreement.comments = action.payload.data.comments;
                    } else {
                        agreement.comments = agreement.comments.filter((c, idx) => idx !== action.payload.commentId);
                    }
                }
            })
            // Edit Agreement
            .addCase(editAgreement.fulfilled, (state, action) => {
                const agreement = state.agreements.find(a => a._id === action.payload._id);
                if (agreement) {
                    agreement.comments = action.payload.comments;
                }
            })
            // Remove Agreement
            .addCase(removeAgreement.fulfilled, (state, action) => {
                state.agreements = state.agreements.filter(a => a._id !== action.payload);
            });
    }
});

export const { clearError } = agreementsSlice.actions;
export default agreementsSlice.reducer; 