const crypto = require('crypto');
const fs = require('fs').promises;
const http = require('http');
const path = require('path');
const { promisify } = require('util');
const express = require('express');

const scrypt = promisify(crypto.scrypt);
const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.USER_DATA_DIR || path.join(__dirname, 'user-data');
const SESSION_TTL_SECONDS = 30 * 60;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = 'scrypt';
const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production'
    ? null
    : crypto.randomBytes(32).toString('hex')
);

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be configured in production.');
}
if (SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long.');
}

if (process.env.NODE_ENV !== 'production' && !process.env.SESSION_SECRET) {
  console.warn('Using an ephemeral local session secret; sessions expire when the server restarts.');
}

const revokedSessions = new Map();

app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'https://shivamkhachane.github.io'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Todu-Auth-Version');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

const sanitizeEmail = (email) => email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
const getUserFilePath = (email) => path.join(DATA_DIR, `${sanitizeEmail(email)}.txt`);

const readUserFile = async (email) => {
  const content = await fs.readFile(getUserFilePath(email), 'utf8');
  return JSON.parse(content);
};

const writeUserFile = async (userData) => {
  await fs.writeFile(getUserFilePath(userData.email), JSON.stringify(userData, null, 2), 'utf8');
};

const isValidEmail = (email) =>
  typeof email === 'string' &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const decodeLegacyPassword = (password) => {
  if (typeof password !== 'string') return null;
  const decoded = Buffer.from(password, 'base64').toString('utf8');
  const normalizedInput = password.replace(/=+$/, '');
  const normalizedEncoding = Buffer.from(decoded, 'utf8').toString('base64').replace(/=+$/, '');
  return normalizedInput && normalizedInput === normalizedEncoding ? decoded : null;
};

const getSubmittedPassword = (req) => {
  const password = req.body.password;
  if (typeof password !== 'string' || password.length > 1024) return null;
  if (req.get('X-Todu-Auth-Version') === '2') return password;
  return decodeLegacyPassword(password);
};

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${PASSWORD_HASH_PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
};

const verifyPassword = async (password, storedPassword) => {
  if (typeof storedPassword !== 'string') return false;
  const parts = storedPassword.split('$');
  if (parts.length === 3 && parts[0] === PASSWORD_HASH_PREFIX) {
    const salt = Buffer.from(parts[1], 'hex');
    const expectedKey = Buffer.from(parts[2], 'hex');
    if (salt.length !== 16 || expectedKey.length !== PASSWORD_KEY_LENGTH) return false;
    const actualKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
    return crypto.timingSafeEqual(expectedKey, actualKey);
  }

  const legacyPassword = decodeLegacyPassword(storedPassword);
  const candidate = legacyPassword === null ? storedPassword : legacyPassword;
  const candidateBuffer = Buffer.from(candidate, 'utf8');
  const passwordBuffer = Buffer.from(password, 'utf8');
  return candidateBuffer.length === passwordBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, passwordBuffer);
};

const encodeTokenPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const issueSessionToken = (email) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: email,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
    jti: crypto.randomBytes(16).toString('hex'),
  };
  const encodedPayload = encodeTokenPart(payload);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return { token: `${encodedPayload}.${signature}`, expiresAt: payload.exp * 1000 };
};

const verifySessionToken = (token) => {
  if (typeof token !== 'string') return null;
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra) return null;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(signature, 'base64url');
  } catch (error) {
    return null;
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (
      !isValidEmail(payload.sub) ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      typeof payload.jti !== 'string'
    ) {
      return null;
    }
    const revokedUntil = revokedSessions.get(payload.jti);
    if (revokedUntil) {
      if (revokedUntil > Math.floor(Date.now() / 1000)) return null;
      revokedSessions.delete(payload.jti);
    }
    return payload;
  } catch (error) {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer (.+)$/);
  const session = match ? verifySessionToken(match[1]) : null;
  if (!session) {
    return res.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' });
  }
  req.auth = session;
  next();
};

const sendAuthResponse = (res, email) => {
  const now = Math.floor(Date.now() / 1000);
  for (const [sessionId, expiresAt] of revokedSessions) {
    if (expiresAt <= now) revokedSessions.delete(sessionId);
  }
  const session = issueSessionToken(email);
  res.json({ email, token: session.token, expiresAt: session.expiresAt });
};

const sendServerError = (res, message, error) => {
  console.error(message, error);
  res.status(500).json({ message });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  const password = getSubmittedPassword(req);
  if (!isValidEmail(email) || password === null || !password) {
    return res.status(400).json({ message: 'A valid email and password are required.' });
  }

  try {
    const userData = await readUserFile(email.trim().toLowerCase());
    if (!(await verifyPassword(password, userData.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!userData.password.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      userData.password = await hashPassword(password);
      await writeUserFile(userData);
    }
    sendAuthResponse(res, userData.email);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    sendServerError(res, 'Unable to sign in.', error);
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email } = req.body;
  const password = getSubmittedPassword(req);
  if (!isValidEmail(email) || password === null || password.length < 8) {
    return res.status(400).json({ message: 'Enter a valid email and a password of at least 8 characters.' });
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const normalizedEmail = email.trim().toLowerCase();
    const userData = { email: normalizedEmail, password: await hashPassword(password), tasks: [] };
    await fs.writeFile(getUserFilePath(normalizedEmail), JSON.stringify(userData, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    sendAuthResponse(res, userData.email);
  } catch (error) {
    if (error.code === 'EEXIST') {
      return res.status(409).json({ message: 'This email is already registered.' });
    }
    sendServerError(res, 'Unable to create the account.', error);
  }
});

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json({ email: req.auth.sub, expiresAt: req.auth.exp * 1000 });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  revokedSessions.set(req.auth.jti, req.auth.exp);
  res.sendStatus(204);
});

app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const userData = await readUserFile(req.auth.sub);
    res.json({ tasks: userData.tasks || [] });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'User not found.' });
    }
    sendServerError(res, 'Unable to read your tasks.', error);
  }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ message: 'Invalid task list.' });
  }

  try {
    const userData = await readUserFile(req.auth.sub);
    userData.tasks = tasks;
    await writeUserFile(userData);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'User not found.' });
    }
    sendServerError(res, 'Unable to save your tasks.', error);
  }
});

if (require.main === module) {
  http.createServer(app).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = { app, hashPassword, verifyPassword };
