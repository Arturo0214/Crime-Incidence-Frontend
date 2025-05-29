import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    createAttendance,
    getAttendance,
    updateAttendance,
    deleteAttendance
} from '../services/attendance';

export const fetchAttendance = createAsyncThunk(
    'attendance/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const data = await getAttendance();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al cargar asistencias');
        }
    }
);

export const addAttendance = createAsyncThunk(
    'attendance/add',
    async (attendanceData, { rejectWithValue }) => {
        try {
            const data = await createAttendance(attendanceData);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al registrar asistencia');
        }
    }
);

export const editAttendance = createAsyncThunk(
    'attendance/edit',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const result = await updateAttendance(id, data);
            return result;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al actualizar asistencia');
        }
    }
);

export const removeAttendance = createAsyncThunk(
    'attendance/remove',
    async (id, { rejectWithValue }) => {
        try {
            await deleteAttendance(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.message || 'Error al eliminar asistencia');
        }
    }
);

const initialState = {
    attendance: [],
    loading: false,
    error: null
};

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAttendance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAttendance.fulfilled, (state, action) => {
                state.loading = false;
                state.attendance = action.payload;
            })
            .addCase(fetchAttendance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(addAttendance.fulfilled, (state, action) => {
                state.attendance.push(action.payload);
            })
            .addCase(editAttendance.fulfilled, (state, action) => {
                const idx = state.attendance.findIndex(a => a._id === action.payload._id);
                if (idx !== -1) {
                    state.attendance[idx] = action.payload;
                }
            })
            .addCase(removeAttendance.fulfilled, (state, action) => {
                state.attendance = state.attendance.filter(a => a._id !== action.payload);
            });
    }
});

export const { clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer; 