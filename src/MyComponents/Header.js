import React, { useState } from 'react';
import logo from '../logo.png';

const NavIcon = ({ name }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    export: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 17v4h14v-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
};

export const Header = ({
  isLoggedIn,
  userEmail,
  onLogout,
  onNavigate,
  onExport,
  onToggleTheme,
  theme,
  currentPage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const navigate = (page) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <>
      <div className="mobile-topbar">
        <button
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="icon-button mobile-menu-button"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <NavIcon name={isOpen ? 'close' : 'menu'} />
        </button>
        <div className="mobile-brand">
          <img src={logo} alt="" />
          <span>Todu</span>
        </div>
        <button
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="icon-button"
          onClick={onToggleTheme}
          type="button"
        >
          <NavIcon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
      {isOpen && (
        <button
          aria-label="Close navigation menu"
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      )}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <button className="brand-lockup" onClick={() => navigate('home')} type="button">
          <img src={logo} alt="" />
          <span>Todu</span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="sidebar-nav">
          <button
            aria-current={currentPage === 'home' ? 'page' : undefined}
            className={`sidebar-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
            type="button"
          >
            <NavIcon name="home" />
            <span>{isLoggedIn ? 'My tasks' : 'Home'}</span>
          </button>
          <button
            aria-current={currentPage === 'about' ? 'page' : undefined}
            className={`sidebar-link ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => navigate('about')}
            type="button"
          >
            <NavIcon name="about" />
            <span>About</span>
          </button>
          {isLoggedIn && (
            <button className="sidebar-link" onClick={onExport} type="button">
              <NavIcon name="export" />
              <span>Export tasks</span>
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-link theme-button" onClick={onToggleTheme} type="button">
            <NavIcon name={theme === 'dark' ? 'sun' : 'moon'} />
            <span>{theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span>
          </button>
          {isLoggedIn ? (
            <div className="account-card">
              <div aria-hidden="true" className="account-avatar">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="account-details">
                <span className="account-name">Your account</span>
                <span className="account-email" title={userEmail}>{userEmail}</span>
              </div>
              <button
                aria-label="Log out"
                className="icon-button logout-button"
                onClick={onLogout}
                title="Log out"
                type="button"
              >
                <NavIcon name="logout" />
              </button>
            </div>
          ) : (
            <p className="sidebar-note">A little more focus, every day.</p>
          )}
        </div>
      </aside>
    </>
  );
};
