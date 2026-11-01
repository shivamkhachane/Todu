import React, { useState } from 'react';

export const Login = ({ onLogin, onRegister, isSubmitting, connectionError }) => {
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
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="eyebrow">A CALMER WAY TO GET THINGS DONE</div>
        <h1>Make room for what matters.</h1>
        <p>
          Keep your plans in one thoughtful space. A clear list is a good place to begin.
        </p>
        <div className="auth-note">
          <span aria-hidden="true" className="auth-note-icon">✳</span>
          <span>Small steps add up. Start with one.</span>
        </div>
      </section>

      <section aria-labelledby="auth-title" className="auth-card">
        <div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'YOUR NEXT CHAPTER'}</div>
        <h2 id="auth-title">{mode === 'login' ? 'Sign in to Todu' : 'Create your account'}</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Pick up right where you left off.'
            : 'A little structure can make a big difference.'}
        </p>
        {connectionError && <div className="inline-alert" role="status">{connectionError}</div>}
        {error && <div className="inline-alert" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {mode === 'register' && (
            <div className="field-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                autoComplete="new-password"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                required
              />
            </div>
          )}
          <button className="button-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'New to Todu?' : 'Already have an account?'}
          <button disabled={isSubmitting} onClick={toggleMode} type="button">
            {mode === 'login' ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </section>
    </div>
  );
};
