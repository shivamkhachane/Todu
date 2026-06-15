import React from 'react';

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
  filteredTasks,
  tasks,
}) => {
  return (
    <>
      <div className="welcome-card p-4 rounded shadow-sm bg-white text-start">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h2>Welcome back, {userEmail}!</h2>
            <p>Use the navigation bar to continue managing your work history.</p>
          </div>
          <button
            className="btn btn-primary btn-circle btn-lg"
            type="button"
            onClick={onToggleTaskForm}
          >
            +
          </button>
        </div>
        {showExportForm && (
          <div className="export-panel card mt-4 p-4 bg-light shadow-sm">
            <h5 className="mb-3">Export tasks by date range</h5>
            {exportError && <div className="alert alert-danger">{exportError}</div>}
            <form onSubmit={onExportSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="exportFrom" className="form-label">
                  From
                </label>
                <input
                  id="exportFrom"
                  type="date"
                  className="form-control"
                  value={exportFromDate}
                  onChange={(event) => setExportFromDate(event.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="exportTo" className="form-label">
                  To
                </label>
                <input
                  id="exportTo"
                  type="date"
                  className="form-control"
                  value={exportToDate}
                  onChange={(event) => setExportToDate(event.target.value)}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end gap-2">
                <button type="submit" className="btn btn-success w-100">
                  Export to Excel
                </button>
                <button
                  type="button"
                  className="btn btn-secondary w-100"
                  onClick={onExportCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {showTaskForm && (
          <div className="task-form card mt-4 p-4 bg-light shadow-sm">
            <h5 className="mb-3">{taskToEdit ? 'Edit task' : 'Add a new task'}</h5>
            {taskError && <div className="alert alert-danger">{taskError}</div>}
            <form onSubmit={onTaskSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="taskDate" className="form-label">
                    Date
                  </label>
                  <input
                    id="taskDate"
                    type="date"
                    className="form-control"
                    value={newTaskDate}
                    onChange={(event) => setNewTaskDate(event.target.value)}
                  />
                </div>
                <div className="col-md-8">
                  <label htmlFor="taskText" className="form-label">
                    Task description
                  </label>
                  <input
                    id="taskText"
                    type="text"
                    className="form-control"
                    value={newTaskText}
                    onChange={(event) => setNewTaskText(event.target.value)}
                    placeholder="Describe the task"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success mt-3 me-2">
                {taskToEdit ? 'Update Task' : 'Add Task'}
              </button>
              {taskToEdit && (
                <button
                  type="button"
                  className="btn btn-secondary mt-3"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}
      </div>
      <div className="task-board mt-4">
        {filteredTasks.length === 0 ? (
          <div className="text-muted">
            {tasks.length === 0 ? 'No tasks yet. Click + to add one.' : 'No tasks match that date.'}
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4">
            {filteredTasks.map((task) => (
              <div className="col" key={task.id}>
                <div className="task-card card h-100 text-white overflow-hidden position-relative">
                  <div className="task-card-overlay"></div>
                  <div className="card-body d-flex flex-column position-relative">
                    <div className="task-card-header text-center mb-3">
                      <div className="task-date">{task.date}</div>
                      <button
                        type="button"
                        className="btn btn-sm btn-light text-dark mt-2 edit-button"
                        onClick={() => onEditTask(task)}
                      >
                        Edit
                      </button>
                    </div>
                    <p className="task-card-text mb-0">{task.task}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
