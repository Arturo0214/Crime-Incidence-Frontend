# Crime Incidence Map - Frontend

This is the frontend application for the Crime Incidence Map, built with React, Redux Toolkit, and Leaflet. It provides an interactive interface for visualizing and managing crime incidents, attendance records, special instructions, citizen requests, and agreements.

## Features

- Interactive map visualization using Leaflet
- Real-time incident tracking and statistics
- Secure HTTPS communication with backend
- JWT-based authentication
- Responsive design with Bootstrap
- Data visualization with Chart.js
- State management with Redux Toolkit
- Form validation and error handling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (see Backend-Incidence README)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Frontend-Incidence
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
REACT_APP_API_URL=https://crime-incidence-backend.onrender.com/api
```

## Project Structure and Code Details

```
Frontend-Incidence/
├── public/          # Static files
│   └── index.html   # Main HTML file
│
├── src/
│   ├── assets/      # Static assets
│   │   └── logo.svg # Application logo
│   │
│   ├── components/  # React components
│   │   ├── gabinete/    # Cabinet-related components
│   │   ├── map/         # Map-related components
│   │   ├── Navbar.jsx   # Navigation bar component
│   │   ├── Footer.jsx   # Footer component
│   │   └── IncidentMap.jsx # Main map component
│   │
│   ├── config/     # Configuration files
│   │   └── axiosConfig.js # Axios instance configuration
│   │
│   ├── constants/  # Application constants
│   │
│   ├── pages/     # Page components
│   │   ├── Auth/      # Authentication pages
│   │   ├── Gabinete/  # Cabinet pages
│   │   ├── Map/       # Map pages
│   │   └── Statistics/# Statistics pages
│   │
│   ├── services/  # API services
│   │   ├── agreements.js      # Agreement-related API calls
│   │   ├── attendance.js      # Attendance-related API calls
│   │   ├── axiosConfig.js     # Axios configuration
│   │   ├── citizenrequests.js # Citizen request API calls
│   │   ├── incidents.js       # Incident-related API calls
│   │   ├── instructions.js    # Instruction-related API calls
│   │   └── user.js           # User-related API calls
│   │
│   ├── slices/    # Redux Toolkit slices
│   │
│   ├── utils/     # Utility functions
│   │
│   ├── App.jsx    # Main application component
│   ├── App.css    # Main application styles
│   ├── index.js   # Application entry point
│   └── index.css  # Global styles
│
├── craco.config.js  # CRACO configuration
└── package.json     # Project dependencies
```

## Component Details

### Map Component
The main map visualization is implemented in `IncidentMap.jsx`:

```jsx
// components/IncidentMap.jsx
import { MapContainer, TileLayer } from 'react-leaflet';

const IncidentMap = () => {
  return (
    <MapContainer center={[19.45, -99.14]} zoom={15}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {/* Map layers and markers */}
    </MapContainer>
  );
};
```

### API Services
API calls are organized in service files:

```javascript
// services/incidents.js
import axios from './axiosConfig';

export const getIncidents = async () => {
  try {
    const response = await axios.get('/incidents');
    return response.data;
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
};
```

## Security Features

1. Axios Configuration:
```javascript
// services/axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Runs the test suite
- `npm eject` - Ejects from Create React App

## Development

The development server runs on `http://localhost:3000` and proxies API requests to the backend.

## Production Deployment

For production deployment:
1. Update environment variables
2. Build the application:
```bash
npm run build
```
3. Deploy the contents of the `build` directory to your web server
4. Configure your web server to serve the application over HTTPS
5. Update the API URL to point to your production backend

## Dependencies

- React 19.1.0 - UI library
- Redux Toolkit 2.8.2 - State management
- Leaflet 1.9.4 - Map visualization
- Chart.js 4.4.9 - Data visualization
- Bootstrap 5.3.5 - UI components
- Axios 1.8.4 - HTTP client
- React Router DOM 7.5.1 - Routing
- CRACO 7.1.0 - Configuration override

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
