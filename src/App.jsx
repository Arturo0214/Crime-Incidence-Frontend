import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './config/store';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Map from './pages/Map/Map.jsx';
import Statistics from './pages/Statistics/Statistics.jsx';
import Gabinete from './pages/Gabinete/Gabinete.jsx';
import Login from './pages/Auth/Login.jsx';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('map');

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <div className="d-flex flex-column min-vh-100">
            <Navbar activeSection={activeSection} setActiveSection={setActiveSection} />
            <main className="flex-grow-1">
              <Routes>
                <Route path="/" element={<Map />} />
                <Route path="/gabinete" element={<Gabinete />} />
                <Route path="/gabinete/:quadrantId" element={<Gabinete />} />
                <Route path="/gabinete/:quadrantId/details" element={<Gabinete />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App;
