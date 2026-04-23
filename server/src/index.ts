import 'dotenv/config'; // must be first — loads .env before any other module runs
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import joinRoutes from './routes/join';
import pinRoutes from './routes/pins';
import galleryRoutes from './routes/gallery';
import feedbackRoutes from './routes/feedback';
import { initSocket } from './socket';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/auth', authRoutes);
app.use('/trips', tripRoutes);
app.use('/join', joinRoutes);
app.use('/trips', pinRoutes);
app.use('/trips', galleryRoutes);
app.use('/feedback', feedbackRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

initSocket(server);

const PORT = process.env.PORT || 4000;

console.log('Starting DB authenticate');

sequelize
  .authenticate()
  .then(() => {
    console.log('DB authenticate OK');
    return sequelize.sync();
  })
  .then(() => {
    console.log('DB sync OK');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB boot failed:', err);
    process.exit(1);
  });

export { server };
