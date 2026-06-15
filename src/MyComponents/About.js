import React from 'react';

export const About = () => {
  return (
    <div className="welcome-card p-4 rounded shadow-sm bg-white text-start">
      <h2>About this app</h2>
      <p>
        This application provides login and registration with credentials and task data
        stored on the local development server in per-user text files (under the
        <strong> user-data/</strong> directory). Passwords are Base64-encoded in this demo
        for simple storage — do not rely on Base64 for security in production. Use
        proper password hashing (bcrypt, argon2) and HTTPS in real deployments.
      </p>
      <div>
        <h5>Key Features</h5>
        <ul>
          <li>Server-backed user accounts and per-user task files</li>
          <li>Login, registration, and a dashboard per authenticated user</li>
          <li>Add, edit, and search tasks by date using the navbar date picker</li>
          <li>Export tasks to Excel (.xls) for a chosen date range</li>
          <li>Responsive task cards with in-place editing</li>
          <li>Development storage: <strong>user-data/</strong> (text files per user)</li>
        </ul>
      </div>
      <p className="mt-3">
        Development notes: start the backend with <code>npm run server</code> and the frontend
        with <code>npm start</code>. For production use, replace file-based storage with a database
        and secure password storage.
      </p>
    </div>
  );
};
