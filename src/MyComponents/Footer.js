import React from 'react';

export const Footer = ({ currentYear }) => (
  <footer className="app-footer">
    <span>Todu · a thoughtful place for your tasks</span>
    <span>© {currentYear}</span>
  </footer>
);
