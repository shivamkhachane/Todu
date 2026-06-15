import React, { useState } from 'react';

export const Login = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      const registerError = await onRegister(email.trim(), password);
      if (registerError) {
        setError(registerError);
        return;
      }
    } else {
      const loginError = await onLogin(email.trim(), password);
      if (loginError) {
        setError(loginError);
        return;
      }
    }

    setError('');
  };

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="login-card card shadow-sm">
      <div className="card-body">
        <h2 className="card-title mb-3">{mode === 'login' ? 'Login' : 'Register'}</h2>
        <p className="text-muted mb-4">
          {mode === 'login'
            ? 'Enter your credentials to continue.'
            : 'Create a new account to access the dashboard.'}
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </div>
          {mode === 'register' && (
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary w-100">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="mt-3 text-center">
          <button type="button" className="btn btn-link p-0" onClick={toggleMode}>
            {mode === 'login'
              ? 'Need an account? Register now'
              : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
