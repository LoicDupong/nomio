import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import joinRoutes from './routes/join';
import pinRoutes from './routes/pins';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/auth', authRoutes);
app.use('/trips', tripRoutes);
app.use('/join', joinRoutes);
app.use('/trips', pinRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;

sequelize.sync({ alter: false }).then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

export { server };
