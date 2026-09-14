import express from 'express';
import cors from 'cors';
import { router as sellerInterest } from './sellerInterest.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/seller-interest', sellerInterest);

// Express 5 forwards rejected async handlers here, so routes need no try/catch.
app.use((err, req, res, next) => {
  if (err.status >= 400 && err.status < 500) {
    const error = err.type === 'entity.parse.failed' ? 'Request body must be valid JSON.' : err.message;
    return res.status(err.status).json({ error });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
