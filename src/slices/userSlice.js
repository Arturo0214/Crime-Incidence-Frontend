import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as userService from '../services/user';

// Thunks
export const login = createAsyncThunk(
    'user/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const data = await userService.login(credentials);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message || 'Error al iniciar sesión');
        }
    }
);

export const checkAuth = createAsyncThunk(
    'user/checkAuth',
    async (_, { rejectWithValue }) => {
        try {
            const user = userService.getCurrentUser();
            if (!user) throw new Error('No token found');
            return user;
        } catch (error) {
            return rejectWithValue(error.message || 'Error de autenticación');
        }
    }
);

const initialState = {
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.loading = false;
            state.error = null;
            localStorage.removeItem('token');
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                localStorage.setItem('token', action.payload.token);
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || action.payload || 'Error al iniciar sesión';
            })
            // Check Auth
            .addCase(checkAuth.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(checkAuth.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || action.payload || 'Error de autenticación';
                state.user = null;
                state.token = null;
                localStorage.removeItem('token');
            });
    }
});

export const { logout, clearError } = userSlice.actions;
export default userSlice.reducer; 