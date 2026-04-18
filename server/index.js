const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 MachineOS Server चालू आहे!',
    status: 'OK'
  });
});

// Routes (नंतर add करू)
// app.use('/api/auth', authRoutes);
// app.use('/api/machines', machineRoutes);
// app.use('/api/wallet', walletRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});