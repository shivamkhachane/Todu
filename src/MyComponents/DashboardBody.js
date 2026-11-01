import React, { useEffect, useRef } from 'react';

const formatTaskDate = (dateValue) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return dateValue;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const getTaskStats = (tasks) => [
  { label: 'All tasks', value: tasks.length, detail: 'Everything on your list', icon: '01' },
  {
    label: 'To do',
    value: tasks.filter((task) => !task.completed).length,
    detail: 'Ready when you are',
    icon: '02',
  },
  {
    label: 'Completed',
    value: tasks.filter((task) => Boolean(task.completed)).length,
    detail: 'Look what you finished',
    icon: '03',
  },
];

export const DashboardBody = ({
  userEmail,
  showExportForm,
  exportError,
  exportFromDate,
  exportToDate,
  setExportFromDate,
  setExportToDate,
  onExportSubmit,
  onExportCancel,
  showTaskForm,
  taskError,
  onTaskSubmit,
  newTaskDate,
  newTaskText,
  setNewTaskDate,
  setNewTaskText,
  taskToEdit,
  onToggleTaskForm,
  onCancelEdit,
  onEditTask,
  taskToDelete,
  onRequestDeleteTask,
  onDeleteTask,
  onCancelDeleteTask,
  onToggleTaskCompletion,
  filteredTasks,
  tasks,
  searchQuery,
  onSearch,
  taskTextQuery,
  onTaskTextSearch,
  taskStatusFilter,
  onTaskStatusFilter,
  taskSortOrder,
  onTaskSortOrder,
  onClearTaskFilters,
  tasksLoading,
  taskSubmitting,
  onClearTaskError,
  pendingUndo,
  undoError,
  onUndoDelete,
  onDismissUndo,
}) => {
  const stats = getTaskStats(tasks);
  const deleteButtonRef = useRef(null);
  const editTriggerRef = useRef(null);
  const previousTaskToDelete = useRef(null);
  const previousShowTaskForm = useRef(false);
  const taskListHeadingRef = useRef(null);

  useEffect(() => {
    if (previousShowTaskForm.current && !showTaskForm) {
      const returnFocusTarget = editTriggerRef.current?.isConnected
        ? editTriggerRef.current
        : taskListHeadingRef.current;
      returnFocusTarget?.focus();
    }
    previousShowTaskForm.current = showTaskForm;
  }, [showTaskForm]);

  useEffect(() => {
    if (previousTaskToDelete.current && !taskToDelete) {
      const returnFocusTarget = deleteButtonRef.current?.isConnected
        ? deleteButtonRef.current
        : taskListHeadingRef.current;
      returnFocusTarget?.focus();
    }
    previousTaskToDelete.current = taskToDelete;
  }, [taskToDelete]);

  const handleDialogKeyDown = (event, onClose) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = event.currentTarget.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <>
    <div className="dashboard">
      <section className="dashboard-heading">
        <div>
          <div className="eyebrow">YOUR PERSONAL WORKSPACE</div>
          <h1>Good to see you{userEmail ? `, ${userEmail.split('@')[0]}` : ''}.</h1>
          <p>Make today a little more intentional. One task at a time.</p>
        </div>
        <button className="button-primary" disabled={taskSubmitting} onClick={onToggleTaskForm} type="button">
          <span aria-hidden="true" className="button-plus">+</span>
          Add a task
        </button>
      </section>

      <section aria-label="Task summary" className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-card-top">
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-detail">{stat.detail}</div>
          </article>
        ))}
      </section>

      {(taskError || showExportForm) && (
        <section className="workspace-panels">
          {taskError && !taskToDelete && !showTaskForm && (
            <div className="inline-alert" role="alert">
              <span>{taskError}</span>
              <button aria-label="Dismiss message" onClick={onClearTaskError} type="button">×</button>
            </div>
          )}
          {showExportForm && (
            <form className="editor-panel export-editor" onSubmit={onExportSubmit}>
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">TAKE IT WITH YOU</div>
                  <h2>Export tasks</h2>
                </div>
                <button aria-label="Close export form" className="icon-button" onClick={onExportCancel} type="button">
                  ×
                </button>
              </div>
              {exportError && <div className="inline-alert" role="alert">{exportError}</div>}
              <div className="editor-fields">
                <div className="field-group">
                  <label htmlFor="exportFrom">From</label>
                  <input
                    id="exportFrom"
                    type="date"
                    value={exportFromDate}
                    onChange={(event) => setExportFromDate(event.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="exportTo">To</label>
                  <input
                    id="exportTo"
                    type="date"
                    value={exportToDate}
                    onChange={(event) => setExportToDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="panel-actions">
                <button className="button-primary" type="submit">Export to Excel</button>
                <button className="button-secondary" onClick={onExportCancel} type="button">Cancel</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="task-section">
        <div className="task-section-heading">
          <div>
            <div className="eyebrow">THE PLAN</div>
            <h2 ref={taskListHeadingRef} tabIndex="-1">Your tasks <span className="task-count">{tasks.length}</span></h2>
          </div>
          <div className="task-controls">
            <div className="task-filter task-text-filter">
              <label htmlFor="taskTextSearch">Find a task</label>
              <input
                id="taskTextSearch"
                aria-label="Search task descriptions"
                type="search"
                placeholder="Search descriptions"
                value={taskTextQuery}
                onChange={(event) => onTaskTextSearch(event.target.value)}
              />
            </div>
            <div className="task-filter">
              <label htmlFor="taskDateFilter">Show tasks for</label>
              <input
                id="taskDateFilter"
                aria-label="Filter tasks by date"
                type="date"
                value={searchQuery}
                onChange={(event) => onSearch(event.target.value)}
              />
            </div>
            <div className="task-filter task-sort-filter">
              <label htmlFor="taskSortOrder">Sort by date</label>
              <select
                id="taskSortOrder"
                value={taskSortOrder}
                onChange={(event) => onTaskSortOrder(event.target.value)}
              >
                <option value="upcoming">Upcoming first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
        <div aria-label="Filter task status" className="task-status-filter" role="group">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'To do' },
            { value: 'completed', label: 'Completed' },
          ].map((filter) => (
            <button
              aria-pressed={taskStatusFilter === filter.value}
              className={taskStatusFilter === filter.value ? 'active' : ''}
              key={filter.value}
              onClick={() => onTaskStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {tasksLoading ? (
          <div aria-label="Loading tasks" className="task-list-skeleton">
            {[1, 2, 3].map((item) => <div className="skeleton-row" key={item} />)}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div aria-hidden="true" className="empty-state-mark">✓</div>
            <h3>
              {tasks.length === 0
                ? 'A fresh start.'
                : taskStatusFilter === 'completed'
                  ? 'No completed tasks here.'
                  : taskStatusFilter === 'pending'
                    ? 'Nothing left to do here.'
                    : 'No tasks match these filters.'}
            </h3>
            <p>
              {tasks.length === 0
                ? 'Add your first task and give your day a little direction.'
                : 'Try changing your search or filters to find what you need.'}
            </p>
            {tasks.length === 0 && (
              <button className="button-secondary" onClick={onToggleTaskForm} type="button">Create your first task</button>
            )}
            {tasks.length > 0 && (
              <button className="button-secondary" onClick={onClearTaskFilters} type="button">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map((task) => (
              <article className={`task-row ${task.completed ? 'task-row-completed' : ''}`} key={task.id}>
                <button
                  aria-label={task.completed ? `Mark incomplete: ${task.task}` : `Mark complete: ${task.task}`}
                  aria-pressed={Boolean(task.completed)}
                  className="task-completion-button"
                  disabled={taskSubmitting}
                  onClick={() => onToggleTaskCompletion(task)}
                  type="button"
                >
                  <span aria-hidden="true">{task.completed ? '✓' : ''}</span>
                </button>
                <div className="task-date-mark">
                  <span>{formatTaskDate(task.date)}</span>
                </div>
                <div className="task-row-content">
                  <h3>
                    <button
                      aria-label={`Open task for editing: ${task.task}`}
                      className="task-title-button"
                      onClick={(event) => {
                        editTriggerRef.current = event.currentTarget;
                        onEditTask(task);
                      }}
                      type="button"
                    >
                      {task.task}
                    </button>
                  </h3>
                  <p>{task.completed ? 'Completed' : 'Scheduled task'}</p>
                </div>
                <div className="task-actions">
                  <button
                    aria-label={`Delete task: ${task.task}`}
                    className="button-secondary task-delete-button"
                    disabled={taskSubmitting}
                    onClick={(event) => {
                      deleteButtonRef.current = event.currentTarget;
                      onRequestDeleteTask(task);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
    {showTaskForm && (
      <div
        className="dialog-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !taskSubmitting) onCancelEdit();
        }}
      >
        <form
          aria-describedby="task-editor-description"
          aria-labelledby="task-editor-title"
          aria-modal="true"
          className="editor-panel task-editor-dialog"
          onKeyDown={(event) => handleDialogKeyDown(event, onCancelEdit)}
          onSubmit={onTaskSubmit}
          role="dialog"
        >
          <div className="panel-heading">
            <div>
              <div className="eyebrow">{taskToEdit ? 'UPDATE YOUR PLAN' : 'MAKE IT HAPPEN'}</div>
              <h2 id="task-editor-title">{taskToEdit ? 'Edit task' : 'Add a task'}</h2>
              <p id="task-editor-description">
                {taskToEdit ? 'Make changes to this task.' : 'Give your next task a date and a clear description.'}
              </p>
            </div>
            <button
              aria-label="Close task editor"
              className="icon-button"
              disabled={taskSubmitting}
              onClick={onCancelEdit}
              type="button"
            >
              ×
            </button>
          </div>
          {taskError && (
            <div className="inline-alert" role="alert">
              <span>{taskError}</span>
              <button aria-label="Dismiss message" onClick={onClearTaskError} type="button">×</button>
            </div>
          )}
          <div className="editor-fields">
            <div className="field-group">
              <label htmlFor="taskDate">Date</label>
              <input
                autoFocus
                id="taskDate"
                type="date"
                value={newTaskDate}
                onChange={(event) => setNewTaskDate(event.target.value)}
              />
            </div>
            <div className="field-group task-description-field">
              <label htmlFor="taskText">What needs to get done?</label>
              <input
                id="taskText"
                type="text"
                value={newTaskText}
                onChange={(event) => setNewTaskText(event.target.value)}
                placeholder="Write a clear, actionable task"
              />
            </div>
          </div>
          <div className="panel-actions">
            <button className="button-primary" disabled={taskSubmitting} type="submit">
              {taskSubmitting ? 'Saving…' : taskToEdit ? 'Save changes' : 'Add task'}
            </button>
            <button className="button-secondary" disabled={taskSubmitting} onClick={onCancelEdit} type="button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}
    {taskToDelete && (
      <div
        className="dialog-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCancelDeleteTask();
        }}
      >
        <section
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          aria-modal="true"
          className="delete-dialog"
          onKeyDown={(event) => handleDialogKeyDown(event, onCancelDeleteTask)}
          role="alertdialog"
        >
          <div aria-hidden="true" className="delete-dialog-icon">!</div>
          <div className="eyebrow">REMOVE TASK</div>
          <h2 id="delete-dialog-title">Delete this task?</h2>
          <p id="delete-dialog-description">
            <span className="delete-dialog-task">{taskToDelete.task}</span>
            <span>This action can’t be undone.</span>
          </p>
          {taskError && <div className="inline-alert" role="alert">{taskError}</div>}
          <div className="delete-dialog-actions">
            <button
              autoFocus
              className="button-secondary"
              disabled={taskSubmitting}
              onClick={onCancelDeleteTask}
              type="button"
            >
              Keep task
            </button>
            <button
              className="button-danger"
              disabled={taskSubmitting}
              onClick={onDeleteTask}
              type="button"
            >
              {taskSubmitting ? 'Deleting…' : taskError ? 'Try again' : 'Delete task'}
            </button>
          </div>
        </section>
      </div>
    )}
    {pendingUndo && (
      <div aria-live="polite" className={`undo-toast ${undoError ? 'undo-toast-error' : ''}`} role="status">
        <span>
          {undoError || (
            <>
              <strong>Task deleted</strong>
              <span className="undo-task-name">“{pendingUndo.task.task}”</span>
            </>
          )}
        </span>
        <div className="undo-toast-actions">
          <button disabled={taskSubmitting} onClick={onUndoDelete} type="button">
            {taskSubmitting ? 'Restoring…' : undoError ? 'Retry' : 'Undo'}
          </button>
          <button aria-label="Dismiss undo message" disabled={taskSubmitting} onClick={onDismissUndo} type="button">×</button>
        </div>
      </div>
    )}
    </>
  );
};
