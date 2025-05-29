import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getSpecialInstructions,
    createSpecialInstruction,
    updateSpecialInstructionStatus,
    addSpecialInstructionComment,
    deleteSpecialInstruction,
    editSpecialInstructionComment,
    deleteSpecialInstructionComment
} from '../services/instructions';

export const fetchInstructions = createAsyncThunk(
    'instructions/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const data = await getSpecialInstructions();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al cargar consignas');
        }
    }
);

export const createInstruction = createAsyncThunk(
    'instructions/create',
    async (instruction, { rejectWithValue }) => {
        try {
            const data = await createSpecialInstruction(instruction);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al crear consigna');
        }
    }
);

export const updateInstructionStatus = createAsyncThunk(
    'instructions/updateStatus',
    async ({ id, status }, { rejectWithValue }) => {
        try {
            const data = await updateSpecialInstructionStatus(id, status);
            return { id, status, data };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al actualizar estado');
        }
    }
);

export const addInstructionComment = createAsyncThunk(
    'instructions/addComment',
    async ({ id, text, author }, { rejectWithValue }) => {
        try {
            const data = await addSpecialInstructionComment(id, text, author);
            return { id, comment: data };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al añadir comentario');
        }
    }
);

export const deleteInstruction = createAsyncThunk(
    'instructions/delete',
    async (id, { rejectWithValue }) => {
        try {
            await deleteSpecialInstruction(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al eliminar consigna');
        }
    }
);

export const editInstructionComment = createAsyncThunk(
    'instructions/editComment',
    async ({ id, commentIdx, text }, { rejectWithValue }) => {
        try {
            const data = await editSpecialInstructionComment(id, commentIdx, text);
            return { id, commentIdx, data };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al editar comentario');
        }
    }
);

export const removeInstructionComment = createAsyncThunk(
    'instructions/removeComment',
    async ({ id, commentIdx }, { rejectWithValue }) => {
        try {
            const data = await deleteSpecialInstructionComment(id, commentIdx);
            return { id, commentIdx, data };
        } catch (error) {
            return rejectWithValue(error.message || 'Error al eliminar comentario');
        }
    }
);

const initialState = {
    instructions: [],
    loading: false,
    error: null
};

const instructionsSlice = createSlice({
    name: 'instructions',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchInstructions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchInstructions.fulfilled, (state, action) => {
                state.loading = false;
                state.instructions = action.payload;
            })
            .addCase(fetchInstructions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createInstruction.fulfilled, (state, action) => {
                state.instructions.push(action.payload);
            })
            .addCase(updateInstructionStatus.fulfilled, (state, action) => {
                const idx = state.instructions.findIndex(i => i._id === action.payload.id);
                if (idx !== -1) {
                    state.instructions[idx].status = action.payload.status;
                }
            })
            .addCase(addInstructionComment.fulfilled, (state, action) => {
                const idx = state.instructions.findIndex(i => i._id === action.payload.id);
                if (idx !== -1) {
                    state.instructions[idx].comments = [
                        ...(state.instructions[idx].comments || []),
                        action.payload.comment
                    ];
                }
            })
            .addCase(deleteInstruction.fulfilled, (state, action) => {
                state.instructions = state.instructions.filter(i => i._id !== action.payload);
            })
            .addCase(editInstructionComment.fulfilled, (state, action) => {
                const idx = state.instructions.findIndex(i => i._id === action.payload.id);
                if (idx !== -1 && state.instructions[idx].comments[action.payload.commentIdx]) {
                    state.instructions[idx].comments[action.payload.commentIdx].text = action.payload.data.comments[action.payload.commentIdx].text;
                }
            })
            .addCase(removeInstructionComment.fulfilled, (state, action) => {
                const idx = state.instructions.findIndex(i => i._id === action.payload.id);
                if (idx !== -1) {
                    state.instructions[idx].comments = action.payload.data.comments;
                }
            });
    }
});

export const { clearError } = instructionsSlice.actions;
export default instructionsSlice.reducer; 