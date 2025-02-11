const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const serverless = require('serverless-http');

// Use middleware to parse the body as JSON
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

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

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

// For Vercel
module.exports = app;
module.exports.handler = serverless(app);
