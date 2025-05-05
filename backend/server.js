import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Test this
app.get('/ping', (req, res) => {
    res.send("Pong");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});