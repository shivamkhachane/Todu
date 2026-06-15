import React from 'react';

export const Footer = ({ currentYear }) => {
  return (
    <footer className="app-footer">
      <div className="footer-content container d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
        <div>
          <h5>Todo Dashboard</h5>
          <p className="mb-2">
            A simple task tracking app with login, date-based search, and export features.
          </p>
          <small>© {currentYear} Todo Dashboard. All rights reserved.</small>
        </div>
        <div>
          <h6>Contact</h6>
          <p className="mb-1">Email: support@todoapp.local</p>
          <p className="mb-0">Phone: +1 (555) 123-4567</p>
        </div>
      </div>
    </footer>
  );
};
