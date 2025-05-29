import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';
import agreementsReducer from '../slices/agreementsSlice';
import instructionsReducer from '../slices/instructionsSlice';
import attendanceReducer from '../slices/attendanceSlice';
import citizenRequestsReducer from '../slices/citizenRequestsSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const appReducer = combineReducers({
    user: userReducer,
    agreements: agreementsReducer,
    instructions: instructionsReducer,
    attendance: attendanceReducer,
    citizenRequests: citizenRequestsReducer
});

const rootReducer = (state, action) => {
    if (action.type === 'user/logout') {
        storage.removeItem('persist:root');
        state = undefined;
    }
    return appReducer(state, action);
};

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['user', 'agreements', 'instructions', 'attendance', 'citizenRequests']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);
export default store; 