const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'College Transport server is running.' });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚌 College Transport server running on port ${PORT}`);
});
