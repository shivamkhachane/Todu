import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Header } from './MyComponents/Header';
import { Login } from './MyComponents/Login';
import { About } from './MyComponents/About';
import { DashboardBody } from './MyComponents/DashboardBody';
import { Footer } from './MyComponents/Footer';

const API_BASE_URL =
  window.API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');
const AUTH_STORAGE_KEY = 'todu-auth-token';

const getInitialTheme = () => {
  try {
    const savedTheme = window.localStorage.getItem('todu-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error);
  }
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [taskError, setTaskError] = useState('');
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskTextQuery, setTaskTextQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskSortOrder, setTaskSortOrder] = useState('upcoming');
  const [pendingUndo, setPendingUndo] = useState(null);
  const [undoError, setUndoError] = useState('');
  const undoTimeoutRef = useRef(null);
  const [showExportForm, setShowExportForm] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportError, setExportError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);
  const [themeError, setThemeError] = useState('');
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => () => window.clearTimeout(undoTimeoutRef.current), []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to verify the application service.');
        }
      })
      .catch(() => {
        setConnectionError('The application service could not be reached. You can still try signing in.');
      });
  }, []);

  const clearStoredSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to clear the saved sign-in session.', error);
    }
    setAuthToken('');
    setUserEmail('');
    setIsLoggedIn(false);
    setTasks([]);
  }, []);

  const loadTasks = useCallback(async (token) => {
    setTasksLoading(true);
    setTaskError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setTasks([]);
        if (response.status === 401) clearStoredSession();
        return data.message || 'Unable to load your tasks.';
      }
      if (!Array.isArray(data.tasks)) {
        setTasks([]);
        return 'The server returned an invalid task list.';
      }
      setTasks(data.tasks);
      return null;
    } catch (error) {
      setTasks([]);
      return 'Unable to load your tasks. Please try again.';
    } finally {
      setTasksLoading(false);
    }
  }, [clearStoredSession]);

  const saveTasks = useCallback(async (updatedTasks) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) clearStoredSession();
        return result.message || 'Unable to save tasks to the server.';
      }
      return null;
    } catch (error) {
      return 'Unable to save tasks to the server. Please try again.';
    }
  }, [authToken, clearStoredSession]);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      let token;
      try {
        token = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      } catch (error) {
        console.error('Unable to read the saved sign-in session.', error);
        setConnectionError('This browser could not restore your sign-in session. Please sign in again.');
        return;
      }
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) clearStoredSession();
          return;
        }
        const result = await response.json();
        if (cancelled) return;
        setAuthToken(token);
        setUserEmail(result.email);
        setIsLoggedIn(true);
        setCurrentPage('home');
        setTaskError(await loadTasks(token));
      } catch (error) {
        if (!cancelled) {
          setConnectionError('Unable to restore your session. Check your connection and sign in again.');
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [clearStoredSession, loadTasks]);

  const handleLogin = async (email, password) => {
    setAuthSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        return result.message || 'Invalid email or password. Please try again.';
      }
      if (!result.token || !result.email) {
        return 'The server did not return a valid sign-in session.';
      }
      try {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, result.token);
      } catch (error) {
        console.error('Unable to save the sign-in session.', error);
        return 'This browser could not save your sign-in session. Check your privacy settings and try again.';
      }
      setAuthToken(result.token);
      setUserEmail(result.email);
      setIsLoggedIn(true);
      setCurrentPage('home');
      setTaskError(await loadTasks(result.token));
      return null;
    } catch (error) {
      return 'Unable to reach the server. Please try again later.';
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (email, password) => {
    setAuthSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Todu-Auth-Version': '2' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        return result.message || 'This email is already registered. Please login instead.';
      }
      if (!result.token || !result.email) {
        return 'The server did not return a valid sign-in session.';
      }
      try {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, result.token);
      } catch (error) {
        console.error('Unable to save the sign-in session.', error);
        return 'This browser could not save your sign-in session. Check your privacy settings and try again.';
      }
      setAuthToken(result.token);
      setUserEmail(result.email);
      setIsLoggedIn(true);
      setCurrentPage('home');
      setTasks([]);
      setTaskError('');
      return null;
    } catch (error) {
      return 'Unable to register at this time. Please try again later.';
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    const token = authToken;
    window.clearTimeout(undoTimeoutRef.current);
    setPendingUndo(null);
    setUndoError('');
    clearStoredSession();
    setIsLoggedIn(false);
    setCurrentPage('home');
    setSearchQuery('');
    setTaskTextQuery('');
    setTaskStatusFilter('all');
    setTaskError('');
    setShowTaskForm(false);
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => {
        console.error('Unable to revoke the server session during sign out.', error);
      });
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSearchQuery('');
    setTaskTextQuery('');
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
    if (taskSubmitting) return;
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

    setTaskSubmitting(true);
    setTaskError('');
    try {
      const saveError = await saveTasks(updatedTasks);
      if (saveError) {
        setTaskError(saveError);
        return;
      }
      setTasks(updatedTasks);
      setNewTaskDate('');
      setNewTaskText('');
      setTaskToEdit(null);
      setShowTaskForm(false);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleRequestDeleteTask = (task) => {
    setTaskError('');
    setTaskToDelete(task);
  };

  const handleCancelDeleteTask = () => {
    if (taskSubmitting) return;
    setTaskError('');
    setTaskToDelete(null);
  };

  const handleDeleteTask = async () => {
    if (taskSubmitting) return;
    if (!taskToDelete) return;

    const updatedTasks = tasks.filter((task) => task.id !== taskToDelete.id);
    const deletedIndex = tasks.findIndex((task) => task.id === taskToDelete.id);
    setTaskSubmitting(true);
    setTaskError('');
    try {
      const saveError = await saveTasks(updatedTasks);
      if (saveError) {
        setTaskError(saveError);
        return;
      }
      setTasks(updatedTasks);
      window.clearTimeout(undoTimeoutRef.current);
      setPendingUndo({ task: taskToDelete, index: deletedIndex });
      setUndoError('');
      undoTimeoutRef.current = window.setTimeout(() => {
        setPendingUndo(null);
        setUndoError('');
      }, 7000);
      setTaskToDelete(null);
      if (taskToEdit && taskToEdit.id === taskToDelete.id) {
        setTaskToEdit(null);
        setNewTaskDate('');
        setNewTaskText('');
        setShowTaskForm(false);
      }
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleUndoDelete = async () => {
    if (!pendingUndo || taskSubmitting) return;
    const restoredTasks = tasks.slice();
    restoredTasks.splice(pendingUndo.index, 0, pendingUndo.task);
    window.clearTimeout(undoTimeoutRef.current);
    setTaskSubmitting(true);
    setUndoError('');
    try {
      const saveError = await saveTasks(restoredTasks);
      if (saveError) {
        setUndoError(saveError);
        return;
      }
      setTasks(restoredTasks);
      window.clearTimeout(undoTimeoutRef.current);
      setPendingUndo(null);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleToggleTaskCompletion = async (targetTask) => {
    if (taskSubmitting) return;
    const updatedTasks = tasks.map((task) =>
      task.id === targetTask.id ? { ...task, completed: !Boolean(task.completed) } : task
    );
    setTaskSubmitting(true);
    setTaskError('');
    try {
      const saveError = await saveTasks(updatedTasks);
      if (saveError) {
        setTaskError(saveError);
        return;
      }
      setTasks(updatedTasks);
    } finally {
      setTaskSubmitting(false);
    }
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

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      window.localStorage.setItem('todu-theme', nextTheme);
      setThemeError('');
    } catch (error) {
      console.error('Unable to save the theme preference.', error);
      setThemeError('Your theme changed, but this browser could not save the preference.');
    }
  };

  const filteredTasks = tasks
    .filter((task) => task.date.includes(searchQuery.trim()))
    .filter((task) => task.task.toLowerCase().includes(taskTextQuery.trim().toLowerCase()))
    .filter((task) => {
      if (taskStatusFilter === 'pending') return !task.completed;
      if (taskStatusFilter === 'completed') return Boolean(task.completed);
      return true;
    })
    .slice()
    .sort((first, second) => {
      if (taskSortOrder === 'oldest') {
        return first.date.localeCompare(second.date);
      }

      const firstIsUpcoming = first.date >= today;
      const secondIsUpcoming = second.date >= today;
      if (firstIsUpcoming !== secondIsUpcoming) {
        return firstIsUpcoming ? -1 : 1;
      }
      return firstIsUpcoming
        ? first.date.localeCompare(second.date)
        : second.date.localeCompare(first.date);
    });

  return (
    <div className={`app-root theme-${theme}`}>
      <Header
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onExport={handleExportClick}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        currentPage={currentPage}
      />
      <main className="main-shell">
        <div className="topbar">
          <div>
            <span className="topbar-kicker">A LITTLE SPACE TO FOCUS</span>
            <span className="topbar-title">Your day, thoughtfully planned.</span>
          </div>
          {isLoggedIn && <span className="topbar-status"><span /> Your workspace</span>}
        </div>
        <div className="page-content">
          {themeError && (
            <div className="inline-alert theme-alert" role="status">{themeError}</div>
          )}
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
              taskToDelete={taskToDelete}
              onRequestDeleteTask={handleRequestDeleteTask}
              onDeleteTask={handleDeleteTask}
              onCancelDeleteTask={handleCancelDeleteTask}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              filteredTasks={filteredTasks}
              tasks={tasks}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              taskTextQuery={taskTextQuery}
              onTaskTextSearch={setTaskTextQuery}
              taskStatusFilter={taskStatusFilter}
              onTaskStatusFilter={setTaskStatusFilter}
              taskSortOrder={taskSortOrder}
              onTaskSortOrder={setTaskSortOrder}
              onClearTaskFilters={() => {
                setSearchQuery('');
                setTaskTextQuery('');
                setTaskStatusFilter('all');
              }}
              pendingUndo={pendingUndo}
              undoError={undoError}
              onUndoDelete={handleUndoDelete}
              onDismissUndo={() => {
                window.clearTimeout(undoTimeoutRef.current);
                setPendingUndo(null);
                setUndoError('');
              }}
              tasksLoading={tasksLoading}
              taskSubmitting={taskSubmitting}
              onClearTaskError={() => setTaskError('')}
            />
          ) : (
            <Login
              onLogin={handleLogin}
              onRegister={handleRegister}
              isSubmitting={authSubmitting}
              connectionError={connectionError}
            />
          )}
        </div>
        <Footer currentYear={currentYear} />
      </main>
    </div>
  );
}

export default App;
