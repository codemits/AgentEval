/**
 * Mock API Server
 * Simple Express server that returns user data for IDs 1-100
 * Returns 404 for any other ID
 */

import express, { Request, Response } from 'express';
import { config } from './config.js';

const app = express();
const PORT = config.server.port;

// Generate mock user data
function generateUser(id: number): { id: number; name: string; email: string } {
  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`
  };
}

// GET /users/:id endpoint
app.get('/users/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  // Return 200 for IDs 1-100
  if (id >= 1 && id <= 100) {
    res.status(200).json(generateUser(id));
  } else {
    // Return 404 for anything else
    res.status(404).json({ error: 'User not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/users/1`);
});

export default app;
