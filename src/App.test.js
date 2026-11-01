import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const jsonResponse = (data, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: async () => data,
});
const session = { email: 'person@example.com', token: 'test-session-token' };

const signInWithTasks = async (tasks) => {
  global.fetch
    .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
    .mockResolvedValueOnce(jsonResponse(session))
    .mockResolvedValueOnce(jsonResponse({ tasks }));

  const view = render(<App />);
  await screen.findByRole('heading', { name: 'Sign in to Todu' });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'person@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  if (tasks.length) {
    await screen.findByText(tasks[0].task);
  } else {
    await screen.findByText('A fresh start.');
  }
  return view;
};

describe('Todu application', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.API_BASE_URL = '';
    global.fetch = jest.fn();
  });

  test('shows the sign-in experience after checking the service', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in to Todu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('keeps the existing login and task-save API contracts', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(session))
      .mockResolvedValueOnce(jsonResponse({
        tasks: [{ id: 1, date: '2026-11-02', task: 'Review the project' }],
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    render(<App />);
    await screen.findByRole('heading', { name: 'Sign in to Todu' });

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Review the project')).toBeInTheDocument();
    expect(global.fetch.mock.calls[1][0]).toBe('/api/auth/login');
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      email: 'person@example.com',
      password: 'secret',
    });
    expect(global.fetch.mock.calls[1][1].headers['X-Todu-Auth-Version']).toBe('2');
    expect(window.sessionStorage.getItem('todu-auth-token')).toBe(session.token);
    expect(global.fetch.mock.calls[2][0]).toBe('/api/tasks');
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${session.token}`);

    fireEvent.click(screen.getByRole('button', { name: 'Add a task' }));
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-11-03' },
    });
    fireEvent.change(screen.getByLabelText('What needs to get done?'), {
      target: { value: 'Prepare the release' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));
    const [saveUrl, saveOptions] = global.fetch.mock.calls[3];
    expect(saveUrl).toBe('/api/tasks');
    expect(saveOptions.method).toBe('POST');
    expect(saveOptions.headers.Authorization).toBe(`Bearer ${session.token}`);
    expect(JSON.parse(saveOptions.body)).toEqual({
      tasks: [
        { id: 1, date: '2026-11-02', task: 'Review the project' },
        { id: expect.any(Number), date: '2026-11-03', task: 'Prepare the release' },
      ],
    });
    expect(await screen.findByText('Prepare the release')).toBeInTheDocument();
  });

  test('does not present a task as saved when the backend rejects the update', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(session))
      .mockResolvedValueOnce(jsonResponse({ tasks: [] }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Storage is unavailable.' }, false));

    render(<App />);
    await screen.findByRole('heading', { name: 'Sign in to Todu' });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('A fresh start.');
    fireEvent.click(screen.getByRole('button', { name: 'Add a task' }));
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-11-03' },
    });
    fireEvent.change(screen.getByLabelText('What needs to get done?'), {
      target: { value: 'Not persisted' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is unavailable.');
    expect(screen.queryByText('Not persisted')).not.toBeInTheDocument();
    expect(screen.getByLabelText('What needs to get done?')).toHaveValue('Not persisted');
  });

  test('confirms deletion and persists the remaining task list', async () => {
    const task = { id: 1, date: '2026-11-02', task: 'Review the project' };
    await signInWithTasks([task]);
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete task: Review the project' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Review the project');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Delete task', exact: true }));

    expect(await screen.findByText('A fresh start.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(4);
    const [saveUrl, saveOptions] = global.fetch.mock.calls[3];
    expect(saveUrl).toBe('/api/tasks');
    expect(saveOptions.method).toBe('POST');
    expect(JSON.parse(saveOptions.body)).toEqual({ tasks: [] });
  });

  test('restores a valid session and task list after refresh', async () => {
    window.sessionStorage.setItem('todu-auth-token', session.token);
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse({ email: session.email }))
      .mockResolvedValueOnce(jsonResponse({ tasks: [{ id: 1, date: '2026-11-02', task: 'Restored task' }] }));

    render(<App />);

    expect(await screen.findByText('Restored task')).toBeInTheDocument();
    expect(global.fetch.mock.calls[1][0]).toBe('/api/auth/session');
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${session.token}`);
    expect(global.fetch.mock.calls[2][0]).toBe('/api/tasks');
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${session.token}`);
  });

  test('keeps a task when deletion is cancelled or the save fails', async () => {
    const task = { id: 1, date: '2026-11-02', task: 'Review the project' };
    await signInWithTasks([task]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete task: Review the project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep task' }));
    expect(await screen.findByRole('heading', { name: 'Review the project' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3);

    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'Storage is unavailable.' }, false));
    fireEvent.click(screen.getByRole('button', { name: 'Delete task: Review the project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete task', exact: true }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is unavailable.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Review the project' })).toBeInTheDocument();
    expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({ tasks: [] });
  });

  test('opens task editing in a floating window and saves changes', async () => {
    const task = { id: 1, date: '2026-11-02', task: 'Review the project' };
    await signInWithTasks([task]);
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    fireEvent.click(screen.getByRole('button', {
      name: 'Open task for editing: Review the project',
    }));

    const editor = screen.getByRole('dialog', { name: 'Edit task' });
    expect(editor).toBeInTheDocument();
    expect(editor.closest('.dialog-backdrop')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit task: Review the project' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByLabelText('What needs to get done?')).toHaveValue('Review the project');

    fireEvent.change(screen.getByLabelText('What needs to get done?'), {
      target: { value: 'Review the updated project' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('button', {
      name: 'Open task for editing: Review the updated project',
    })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({
      tasks: [{ ...task, task: 'Review the updated project' }],
    });
  });

  test('searches task descriptions, filters by completion, and sorts by date', async () => {
    const tasks = [
      { id: 1, date: '2999-11-05', task: 'Write project notes' },
      { id: 2, date: '2999-11-02', task: 'Plan team meeting', completed: true },
      { id: 3, date: '2999-11-03', task: 'Review project notes' },
    ];
    const { container } = await signInWithTasks(tasks);
    const getTaskTitles = () =>
      Array.from(container.querySelectorAll('.task-row-content h3')).map((heading) => heading.textContent);

    expect(getTaskTitles()).toEqual([
      'Plan team meeting',
      'Review project notes',
      'Write project notes',
    ]);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search task descriptions' }), {
      target: { value: 'PROJECT NOTES' },
    });
    expect(getTaskTitles()).toEqual(['Review project notes', 'Write project notes']);

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(getTaskTitles()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search task descriptions' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Sort by date'), { target: { value: 'oldest' } });
    expect(getTaskTitles()).toEqual([
      'Plan team meeting',
      'Review project notes',
      'Write project notes',
    ]);
  });

  test('sorts historical tasks oldest first by date', async () => {
    const tasks = [
      { id: 1, date: '2025-12-16', task: 'December 16 work' },
      { id: 2, date: '2025-03-10', task: 'March 10 work' },
      { id: 3, date: '2025-12-01', task: 'December 1 work' },
    ];
    const { container } = await signInWithTasks(tasks);
    const getTaskTitles = () =>
      Array.from(container.querySelectorAll('.task-row-content h3')).map((heading) => heading.textContent);

    fireEvent.change(screen.getByLabelText('Sort by date'), { target: { value: 'oldest' } });

    expect(getTaskTitles()).toEqual([
      'March 10 work',
      'December 1 work',
      'December 16 work',
    ]);
  });

  test('persists completing and reopening a task while retaining legacy task compatibility', async () => {
    const task = { id: 1, date: '2026-11-02', task: 'Review the project' };
    await signInWithTasks([task]);
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Review the project' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));
    expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({
      tasks: [{ ...task, completed: true }],
    });
    expect(await screen.findByRole('button', { name: 'Mark incomplete: Review the project' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Mark incomplete: Review the project' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
    expect(JSON.parse(global.fetch.mock.calls[4][1].body)).toEqual({
      tasks: [{ ...task, completed: false }],
    });
  });

  test('undoes a deletion and persists the restored task list', async () => {
    const task = { id: 1, date: '2026-11-02', task: 'Review the project' };
    await signInWithTasks([task]);
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete task: Review the project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete task', exact: true }));
    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review the project' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('heading', { name: 'Review the project' })).toBeInTheDocument();
    expect(screen.queryByText('Task deleted')).not.toBeInTheDocument();
    expect(JSON.parse(global.fetch.mock.calls[4][1].body)).toEqual({ tasks: [task] });
  });
});
