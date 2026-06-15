import React, { useState, useEffect } from 'react';
import './App.css';
import { Header } from './MyComponents/Header';
import { Login } from './MyComponents/Login';
import { About } from './MyComponents/About';
import { DashboardBody } from './MyComponents/DashboardBody';
import { Footer } from './MyComponents/Footer';

const encodePassword = (password) => btoa(password);
const API_BASE_URL = window.API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [taskError, setTaskError] = useState('');
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportForm, setShowExportForm] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportError, setExportError] = useState('');
  const [usersLoaded, setUsersLoaded] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users`)
      .then((response) => response.json())
      .then(() => {})
      .catch(() => {})
      .finally(() => setUsersLoaded(true));
  }, []);

  const loadTasksForEmail = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${encodeURIComponent(email)}`);
      if (!response.ok) {
        setTasks([]);
        return;
      }
      const data = await response.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch {
      setTasks([]);
    }
  };

  const saveTasksForEmail = async (email, updatedTasks) => {
    try {
      await fetch(`${API_BASE_URL}/api/tasks/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
    } catch {
      setTaskError('Unable to save tasks to the server.');
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: encodePassword(password) }),
      });
      const result = await response.json();
      if (!response.ok) {
        return result.message || 'Invalid email or password. Please try again.';
      }
      setUserEmail(result.email);
      setIsLoggedIn(true);
      setCurrentPage('home');
      setTaskError('');
      await loadTasksForEmail(result.email);
      return null;
    } catch {
      return 'Unable to reach the server. Please try again later.';
    }
  };

  const handleRegister = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: encodePassword(password) }),
      });
      const result = await response.json();
      if (!response.ok) {
        return result.message || 'This email is already registered. Please login instead.';
      }
      setUserEmail(result.email);
      setIsLoggedIn(true);
      setCurrentPage('home');
      setTasks([]);
      setTaskError('');
      return null;
    } catch {
      return 'Unable to register at this time. Please try again later.';
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setCurrentPage('home');
    setTasks([]);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSearchQuery('');
  };

  const handleExportClick = () => {
    setExportError('');
    setShowExportForm((current) => !current);
  };

  const handleExportCancel = () => {
    setShowExportForm(false);
    setExportError('');
    setExportFromDate('');
    setExportToDate('');
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  const handleToggleTaskForm = () => {
    setTaskError('');
    if (taskToEdit) {
      setTaskToEdit(null);
      setNewTaskDate('');
      setNewTaskText('');
    }
    setShowTaskForm((current) => !current);
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setNewTaskDate(task.date);
    setNewTaskText(task.task);
    setTaskError('');
    setShowTaskForm(true);
  };

  const handleCancelEdit = () => {
    setTaskToEdit(null);
    setNewTaskDate('');
    setNewTaskText('');
    setTaskError('');
    setShowTaskForm(false);
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    if (!newTaskDate || !newTaskText.trim()) {
      setTaskError('Both date and task description are required.');
      return;
    }

    const updatedTasks = taskToEdit
      ? tasks.map((task) =>
          task.id === taskToEdit.id
            ? { ...task, date: newTaskDate, task: newTaskText.trim() }
            : task
        )
      : [
          ...tasks,
          {
            id: Date.now(),
            date: newTaskDate,
            task: newTaskText.trim(),
          },
        ];

    setTasks(updatedTasks);
    await saveTasksForEmail(userEmail, updatedTasks);
    setNewTaskDate('');
    setNewTaskText('');
    setTaskError('');
    setTaskToEdit(null);
    setShowTaskForm(false);
  };

  const handleExportSubmit = (event) => {
    event.preventDefault();
    if (!exportFromDate || !exportToDate) {
      setExportError('Both start and end date are required.');
      return;
    }

    if (exportFromDate > exportToDate) {
      setExportError('Start date cannot be after end date.');
      return;
    }

    const exportTasks = tasks.filter(
      (task) => task.date >= exportFromDate && task.date <= exportToDate
    );

    if (!exportTasks.length) {
      setExportError('No tasks found in the selected range.');
      return;
    }

    const tableRows = exportTasks
      .map(
        (task) =>
          `<tr><td>${task.date}</td><td>${task.task.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>`
      )
      .join('');

    const tableHtml = `\n      <table>\n        <tr><th>Date</th><th>Task</th></tr>\n        ${tableRows}\n      </table>\n    `;

    const blob = new Blob([tableHtml], {
      type: 'application/vnd.ms-excel',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-${exportFromDate}-to-${exportToDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportError('');
    setShowExportForm(false);
    setExportFromDate('');
    setExportToDate('');
  };

  const filteredTasks = tasks.filter((task) =>
    task.date.includes(searchQuery.trim())
  );

  if (!usersLoaded) {
    return (
      <div className="App login-page">
        <div className="page-content container py-5">
          <div className="welcome-card p-4 rounded shadow-sm bg-white text-start">
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`App ${isLoggedIn ? 'home-page' : 'login-page'}`}>
      <Header
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onExport={handleExportClick}
      />
      <div className="page-content container">
        {currentPage === 'about' ? (
          <About />
        ) : isLoggedIn ? (
          <DashboardBody
            userEmail={userEmail}
            showExportForm={showExportForm}
            exportError={exportError}
            exportFromDate={exportFromDate}
            exportToDate={exportToDate}
            setExportFromDate={setExportFromDate}
            setExportToDate={setExportToDate}
            onExportSubmit={handleExportSubmit}
            onExportCancel={handleExportCancel}
            showTaskForm={showTaskForm}
            taskError={taskError}
            onTaskSubmit={handleTaskSubmit}
            newTaskDate={newTaskDate}
            newTaskText={newTaskText}
            setNewTaskDate={setNewTaskDate}
            setNewTaskText={setNewTaskText}
            taskToEdit={taskToEdit}
            onToggleTaskForm={handleToggleTaskForm}
            onCancelEdit={handleCancelEdit}
            onEditTask={handleEditTask}
            filteredTasks={filteredTasks}
            tasks={tasks}
          />
        ) : (
          <Login onLogin={handleLogin} onRegister={handleRegister} />
        )}
      </div>
      <Footer currentYear={currentYear} />
    </div>
  );
}

export default App;
