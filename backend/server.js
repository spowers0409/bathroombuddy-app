import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import bathroomRoutes from './routes/bathroomRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Explicit allowed origins for frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://admin.bathroombuddy.app'
];

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/ping', (req, res) => {
  res.send("Pong");
});

// API routes (note the /api prefix here)
app.use('/api/bathrooms', bathroomRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
