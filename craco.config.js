const fs = require('fs');
const path = require('path');

module.exports = {
    devServer: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'https://crime-incidence-backend.onrender.com',
                secure: true,
                changeOrigin: true
            }
        }
    },
}; 