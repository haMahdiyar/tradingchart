const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'User-Agent']
}));

// Use middleware to parse the body as JSON
app.use(express.json());

// Serve static files from the "public" folder (where the HTML file is located)
app.use(express.static(path.join(__dirname, 'public')));

// Proxy middleware for TradingView chart storage
const TRADING_VIEW_URL = 'https://saveload.tradingview.com';

// Helper function to forward requests to TradingView
async function forwardRequest(req, res, method) {
  const url = `${TRADING_VIEW_URL}${req.url}`;
  try {
    const response = await fetch(url, {
      method: method || req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'],
        'Accept': 'application/json',
      },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    res.status(response.status);
    
    // Forward response headers
    for (const [key, value] of response.headers.entries()) {
      if (key !== 'content-encoding' && key !== 'content-length') {
        res.setHeader(key, value);
      }
    }
    
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}

// Proxy routes for TradingView chart storage
app.get('/1.1/charts', (req, res) => forwardRequest(req, res));
app.post('/1.1/charts', (req, res) => forwardRequest(req, res));
app.put('/1.1/charts', (req, res) => forwardRequest(req, res));
app.delete('/1.1/charts', (req, res) => forwardRequest(req, res));

app.get('/1.1/study-templates', (req, res) => forwardRequest(req, res));
app.post('/1.1/study-templates', (req, res) => forwardRequest(req, res));
app.put('/1.1/study-templates', (req, res) => forwardRequest(req, res));
app.delete('/1.1/study-templates', (req, res) => forwardRequest(req, res));

// File path for saving the chart state
const stateFile = path.join(__dirname, 'chartState.json');

// API for saving the chart state
app.post('/saveState', (req, res) => {
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'No state provided.' });
  }
  fs.writeFile(stateFile, JSON.stringify(state), err => {
    if (err) {
      console.error('Error saving state:', err);
      return res.status(500).json({ error: 'Saving state encountered an error.' });
    }
    res.json({ message: 'Chart state saved successfully.' });
  });
});

// API for loading the chart state
app.get('/loadState', (req, res) => {
  fs.readFile(stateFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error loading state:', err);
      return res.status(500).json({ error: 'Loading state encountered an error.' });
    }
    let state = {};
    try {
      state = JSON.parse(data);
    } catch(e) {
      console.error('Error parsing state JSON:', e);
    }
    res.json({ state });
  });
});

// Start the server on the specified port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
