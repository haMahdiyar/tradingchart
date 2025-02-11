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

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Proxy middleware for TradingView chart storage
const TRADING_VIEW_URL = 'https://saveload.tradingview.com';

// Helper function to forward requests to TradingView
async function forwardRequest(req, res, method) {
  const targetUrl = `${TRADING_VIEW_URL}${req.url}`;
  console.log('Forwarding request to:', targetUrl);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': req.headers['user-agent'] || 'TradingView Proxy',
      'Accept': 'application/json',
    };

    console.log('Sending request with headers:', headers);

    const fetchOptions = {
      method: method || req.method,
      headers: headers,
    };

    if (['POST', 'PUT'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const data = await response.text();
    console.log('Response data:', data);

    // Set response headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      details: error.message,
      url: targetUrl,
      method: req.method
    });
  }
}

// Proxy routes for TradingView chart storage
app.all('/1.1/charts*', (req, res) => {
  console.log('Received request for charts:', req.method, req.url);
  forwardRequest(req, res);
});

app.all('/1.1/study-templates*', (req, res) => {
  console.log('Received request for templates:', req.method, req.url);
  forwardRequest(req, res);
});

// Handle OPTIONS requests explicitly
app.options('*', cors());

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
