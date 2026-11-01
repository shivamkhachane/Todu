const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');

const dataDirectory = path.join(
  os.tmpdir(),
  `todu-auth-test-${crypto.randomBytes(8).toString('hex')}`
);
process.env.USER_DATA_DIR = dataDirectory;
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough';

const { app, verifyPassword } = require('./server');
const server = http.createServer(app);
let baseUrl;

const userFilePath = (email) =>
  path.join(dataDirectory, `${email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')}.txt`);

const request = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}${route}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
};

before(async () => {
  await fs.mkdir(dataDirectory, { recursive: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await fs.rm(dataDirectory, { recursive: true, force: true });
});

beforeEach(async () => {
  await fs.rm(dataDirectory, { recursive: true, force: true });
  await fs.mkdir(dataDirectory, { recursive: true });
});

test('requires a valid bearer session to read or change tasks', async () => {
  await fs.writeFile(
    userFilePath('person@example.com'),
    JSON.stringify({ email: 'person@example.com', password: 'secret', tasks: [{ id: 1 }] })
  );

  const unauthenticatedRead = await request('/api/tasks');
  assert.equal(unauthenticatedRead.response.status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
    body: JSON.stringify({ email: 'person@example.com', password: 'secret' }),
  });
  assert.equal(login.response.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.email, 'person@example.com');

  const headers = { Authorization: `Bearer ${login.body.token}` };
  const tasks = await request('/api/tasks', { headers });
  assert.deepEqual(tasks.body.tasks, [{ id: 1 }]);

  const save = await request('/api/tasks', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks: [{ id: 2 }] }),
  });
  assert.equal(save.response.status, 200);
  assert.deepEqual(JSON.parse(await fs.readFile(userFilePath('person@example.com'), 'utf8')).tasks, [
    { id: 2 },
  ]);
});

test('migrates a legacy base64 password to a salted scrypt hash on login', async () => {
  await fs.writeFile(
    userFilePath('legacy@example.com'),
    JSON.stringify({
      email: 'legacy@example.com',
      password: Buffer.from('old password').toString('base64'),
      tasks: [],
    })
  );

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
    body: JSON.stringify({ email: 'legacy@example.com', password: 'old password' }),
  });
  assert.equal(login.response.status, 200);

  const user = JSON.parse(await fs.readFile(userFilePath('legacy@example.com'), 'utf8'));
  assert.match(user.password, /^scrypt\$/);
  assert.notEqual(user.password, Buffer.from('old password').toString('base64'));
  assert.equal(await verifyPassword('old password', user.password), true);
});

test('supports the previous frontend login payload during backend rollout', async () => {
  await fs.writeFile(
    userFilePath('legacy@example.com'),
    JSON.stringify({
      email: 'legacy@example.com',
      password: Buffer.from('old password').toString('base64'),
      tasks: [],
    })
  );

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'legacy@example.com',
      password: Buffer.from('old password').toString('base64'),
    }),
  });
  assert.equal(login.response.status, 200);
  assert.match(
    JSON.parse(await fs.readFile(userFilePath('legacy@example.com'), 'utf8')).password,
    /^scrypt\$/
  );
});

test('hashes new account passwords and revokes sessions on logout', async () => {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
    body: JSON.stringify({ email: 'new@example.com', password: 'a secure password' }),
  });
  assert.equal(registration.response.status, 200);
  assert.ok(registration.body.token);

  const user = JSON.parse(await fs.readFile(userFilePath('new@example.com'), 'utf8'));
  assert.match(user.password, /^scrypt\$/);
  assert.notEqual(user.password, 'a secure password');

  const headers = { Authorization: `Bearer ${registration.body.token}` };
  const logout = await request('/api/auth/logout', { method: 'POST', headers });
  assert.equal(logout.response.status, 204);

  const restored = await request('/api/auth/session', { headers });
  assert.equal(restored.response.status, 401);
});

test('rejects short registration passwords and invalid task lists', async () => {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
    body: JSON.stringify({ email: 'new@example.com', password: 'short' }),
  });
  assert.equal(registration.response.status, 400);

  await fs.writeFile(
    userFilePath('person@example.com'),
    JSON.stringify({ email: 'person@example.com', password: 'secret', tasks: [] })
  );
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
    body: JSON.stringify({ email: 'person@example.com', password: 'secret' }),
  });
  const invalidSave = await request('/api/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${login.body.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tasks: 'not an array' }),
  });
  assert.equal(invalidSave.response.status, 400);
});
