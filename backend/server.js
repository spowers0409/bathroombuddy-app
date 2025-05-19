import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import bathroomRoutes from './routes/bathroomRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://admin.bathroombuddy.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Ping test
app.get('/ping', (req, res) => {
  res.send("Pong");
});

app.use('/bathrooms', bathroomRoutes);
app.use('/reviews', reviewRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
