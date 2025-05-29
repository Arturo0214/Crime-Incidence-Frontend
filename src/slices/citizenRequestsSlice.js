import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getCitizenRequests,
    createCitizenRequest,
    updateCitizenRequestStatus,
    addCitizenRequestComment,
    deleteCitizenRequest,
    updateCitizenRequest,
    getCitizenRequestsByLocation
} from '../services/citizenrequests';

// Async thunks
export const fetchCitizenRequests = createAsyncThunk(
    'citizenRequests/fetchAll',
    async () => {
        const response = await getCitizenRequests();
        return response;
    }
);

export const createNewRequest = createAsyncThunk(
    'citizenRequests/create',
    async (requestData) => {
        const response = await createCitizenRequest(requestData);
        return response;
    }
);

export const updateRequestStatus = createAsyncThunk(
    'citizenRequests/updateStatus',
    async ({ id, status }) => {
        const response = await updateCitizenRequestStatus(id, status);
        return response;
    }
);

export const addComment = createAsyncThunk(
    'citizenRequests/addComment',
    async ({ id, text, author }) => {
        const response = await addCitizenRequestComment(id, text, author);
        return response;
    }
);

export const deleteRequest = createAsyncThunk(
    'citizenRequests/delete',
    async (id) => {
        await deleteCitizenRequest(id);
        return id;
    }
);

export const updateRequest = createAsyncThunk(
    'citizenRequests/update',
    async ({ id, data }) => {
        const response = await updateCitizenRequest(id, data);
        return response;
    }
);

export const fetchNearbyRequests = createAsyncThunk(
    'citizenRequests/fetchNearby',
    async ({ longitude, latitude, radius }) => {
        const response = await getCitizenRequestsByLocation(longitude, latitude, radius);
        return response;
    }
);

const initialState = {
    requests: [],
    loading: false,
    error: null,
    selectedRequest: null,
    nearbyRequests: []
};

const citizenRequestsSlice = createSlice({
    name: 'citizenRequests',
    initialState,
    reducers: {
        setSelectedRequest: (state, action) => {
            state.selectedRequest = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch all requests
            .addCase(fetchCitizenRequests.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCitizenRequests.fulfilled, (state, action) => {
                state.loading = false;
                state.requests = action.payload;
            })
            .addCase(fetchCitizenRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            // Create new request
            .addCase(createNewRequest.fulfilled, (state, action) => {
                state.requests.push(action.payload);
            })
            // Update status
            .addCase(updateRequestStatus.fulfilled, (state, action) => {
                const index = state.requests.findIndex(req => req._id === action.payload._id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
            })
            // Add comment
            .addCase(addComment.fulfilled, (state, action) => {
                const index = state.requests.findIndex(req => req._id === action.payload._id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
            })
            // Delete request
            .addCase(deleteRequest.fulfilled, (state, action) => {
                state.requests = state.requests.filter(req => req._id !== action.payload);
            })
            // Update request
            .addCase(updateRequest.fulfilled, (state, action) => {
                const index = state.requests.findIndex(req => req._id === action.payload._id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
            })
            // Fetch nearby requests
            .addCase(fetchNearbyRequests.fulfilled, (state, action) => {
                state.nearbyRequests = action.payload;
            });
    }
});

export const { setSelectedRequest, clearError } = citizenRequestsSlice.actions;
export default citizenRequestsSlice.reducer; 