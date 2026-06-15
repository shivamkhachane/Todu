import React from "react";
import logo from '../logo.png';

export const Header = ({ isLoggedIn, userEmail, onLogout, onNavigate, onSearch, searchQuery, onExport }) => {
  const navigate = (event, page) => {
    event.preventDefault();
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleSearchChange = (event) => {
    if (onSearch) {
      onSearch(event.target.value);
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <a
            className="navbar-brand d-flex align-items-center"
            href="#"
            onClick={(event) => navigate(event, 'home')}
          >
            <img src={logo} alt="Logo" width="36" height="36" className="me-2" />
            <span>Work History</span>
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a
                  className="nav-link active"
                  aria-current="page"
                  href="#"
                  onClick={(event) => navigate(event, 'home')}
                >
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="#"
                  onClick={(event) => navigate(event, 'about')}
                >
                  About
                </a>
              </li>
              {isLoggedIn && (
                <li className="nav-item">
                  <a
                    className="nav-link"
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (onExport) onExport();
                    }}
                  >
                    Export
                  </a>
                </li>
              )}
            </ul>
            {isLoggedIn && (
              <form className="d-flex me-3" role="search" onSubmit={(e) => e.preventDefault()}>
                <input
                  className="form-control me-2"
                  type="date"
                  aria-label="Search by date"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </form>
            )}
            <div className="d-flex align-items-center">
              {isLoggedIn ? (
                <>
                  <span className="me-3 text-muted">Signed in as {userEmail}</span>
                  <button className="btn btn-outline-danger" type="button" onClick={onLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <span className="text-muted">Please login or register.</span>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
