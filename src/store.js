import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import agreementsReducer from './slices/agreementsSlice';

const store = configureStore({
    reducer: {
        user: userReducer,
        agreements: agreementsReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false
        })
});

export default store; 