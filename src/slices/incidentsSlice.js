import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getIncidents } from '../services/incidents';

export const fetchIncidents = createAsyncThunk(
    'incidents/fetchIncidents',
    async () => {
        try {
            const response = await getIncidents();
            return response.data;
        } catch (error) {
            throw error;
        }
    }
);

const initialState = {
    incidents: [],
    loading: false,
    error: null
};

const incidentsSlice = createSlice({
    name: 'incidents',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchIncidents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchIncidents.fulfilled, (state, action) => {
                state.loading = false;
                state.incidents = action.payload;
            })
            .addCase(fetchIncidents.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    }
});

export const { actions: incidentsActions } = incidentsSlice;
export default incidentsSlice.reducer; 