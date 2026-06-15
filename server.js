const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'user-data');
const SEED_FILE = path.join(__dirname, 'public', 'users.json');

app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'https://shivamkhachane.github.io'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const sanitizeEmail = (email) => email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
const getUserFilePath = (email) => path.join(DATA_DIR, `${sanitizeEmail(email)}.txt`);

const readUserFile = async (email) => {
  const filePath = getUserFilePath(email);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const writeUserFile = async (userData) => {
  const filePath = getUserFilePath(userData.email);
  const content = JSON.stringify(userData, null, 2);
  await fs.writeFile(filePath, content, 'utf8');
};

const ensureDataDir = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = await fs.readdir(DATA_DIR);
  if (files.length === 0) {
    try {
      const seedContent = await fs.readFile(SEED_FILE, 'utf8');
      const users = JSON.parse(seedContent);
      if (Array.isArray(users)) {
        for (const user of users) {
          if (user.email && user.password) {
            await writeUserFile({ email: user.email, password: user.password, tasks: [] });
          }
        }
      }
    } catch (error) {
      // Ignore missing seed file or invalid JSON.
    }
  }
};

app.use(express.json());

app.get('/api/users', async (req, res) => {
  try {
    await ensureDataDir();
    const files = await fs.readdir(DATA_DIR);
    const users = files
      .filter((file) => file.endsWith('.txt'))
      .map((file) => file.replace('.txt', ''))
      .map((sanitized) => sanitized);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Unable to read user storage.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const userData = await readUserFile(email);
    if (userData.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    res.json({ email: userData.email, tasks: userData.tasks || [] });
  } catch (error) {
    res.status(401).json({ message: 'Invalid email or password.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const filePath = getUserFilePath(email);
    await fs.access(filePath);
    return res.status(409).json({ message: 'This email is already registered.' });
  } catch (error) {
    const newUser = { email, password, tasks: [] };
    await writeUserFile(newUser);
    return res.json({ email: newUser.email, tasks: newUser.tasks });
  }
});

app.get('/api/tasks/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    const userData = await readUserFile(email);
    res.json({ tasks: userData.tasks || [] });
  } catch (error) {
    res.status(404).json({ message: 'User not found.' });
  }
});

app.post('/api/tasks/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ message: 'Invalid task list.' });
  }

  try {
    const userData = await readUserFile(email);
    userData.tasks = tasks;
    await writeUserFile(userData);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ message: 'User not found.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
