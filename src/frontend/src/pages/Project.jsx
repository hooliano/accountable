import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, dueLabel, errorMessage } from "../api.js";

const columns = [
  ["TODO", "To do"],
  ["IN_PROGRESS", "In progress"],
  ["DONE", "Done"],
];

export default function Project() {
  const { projectId } = useParams();

  return <ProjectBoard key={projectId} projectId={projectId} />;
}

function ProjectBoard({ projectId }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const path = `/projects/${projectId}`;
  useEffect(() => {
    let active = true;
    api
      .get(path)
      .then(({ data }) => {
        if (active) {
          setProject(data.project);
        }
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err));
        }
      });

    return () => {
      active = false;
    };
  }, [path]);

  async function mutate(action, message) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await action();
      const { data } = await api.get(path);
      setProject(data.project);
      setNotice(message);

      return true;
    } catch (err) {
      setError(errorMessage(err));

      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.assigneeId = values.assigneeId ? Number(values.assigneeId) : null;
    const succeeded = await mutate(
      () => {
        if (editing.id) {
          return api.patch(`${path}/tasks/${editing.id}`, values);
        }

        return api.post(`${path}/tasks`, values);
      },
      editing.id ? "Task saved." : "Task added.",
    );

    if (succeeded) {
      setEditing(null);
    }
  }

  async function removeProject() {
    const confirmed = window.confirm(
      `Delete “${project.name}” and all of its tasks? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.delete(path);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <section>
      <Link to="/" className="back-link">
        ← All projects
      </Link>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button
            className="secondary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </p>
      )}
      {!project ? (
        !error && <p role="status">Loading project…</p>
      ) : (
        <>
          <header className="project-header">
            <div>
              <h1>{project.name}</h1>
              <p className="description">{project.description}</p>
              <p className="muted">
                Owner: {project.owner.username} · {dueLabel(project.dueDate)}
              </p>
            </div>
            {project.canEdit && (
              <button disabled={busy} onClick={() => setEditing({})}>
                + Add task
              </button>
            )}
          </header>
          {!project.canEdit && (
            <p className="permission-note">
              You have view-only access to this board.
            </p>
          )}
          <p className="notice" role="status">
            {notice}
          </p>
          {editing && (
            <form
              className="panel stack task-editor"
              key={editing.id ?? "new"}
              onSubmit={saveTask}
            >
              <h2>{editing.id ? "Edit task" : "New task"}</h2>
              <fieldset disabled={busy} className="stack">
                <label>
                  Title
                  <input
                    name="title"
                    maxLength={200}
                    defaultValue={editing.title ?? ""}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    maxLength={10000}
                    defaultValue={editing.description ?? ""}
                    rows={3}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Status
                    <select
                      name="status"
                      defaultValue={editing.status ?? "TODO"}
                    >
                      {columns.map(([value, title]) => (
                        <option key={value} value={value}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assignee
                    <select
                      name="assigneeId"
                      defaultValue={editing.assigneeId ?? ""}
                    >
                      <option value="">Unassigned</option>
                      <option value={project.ownerId}>
                        {project.owner.username}
                      </option>
                      {project.collaborators.map((c) => (
                        <option key={c.userId} value={c.userId}>
                          {c.user.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={editing.dueDate?.slice(0, 10) ?? ""}
                    />
                  </label>
                </div>
                <div className="actions">
                  <button>{busy ? "Saving…" : "Save task"}</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <div className="board">
            {columns.map(([status, title]) => {
              const tasks = project.tasks.filter(
                (task) => task.status === status,
              );

              return (
                <section
                  className={`column column-${status.toLowerCase()}`}
                  key={status}
                  aria-label={title}
                >
                  <h2>
                    {title} <span className="count">{tasks.length}</span>
                  </h2>
                  {!tasks.length && (
                    <p className="empty-column">No tasks here yet.</p>
                  )}
                  {tasks.map((task, index) => (
                    <article className="task-card" key={task.id}>
                      <h3>{task.title}</h3>
                      {task.description && (
                        <p className="description">{task.description}</p>
                      )}
                      <p className="muted">
                        {task.assignee?.username ?? "Unassigned"} ·{" "}
                        {dueLabel(task.dueDate)}
                      </p>
                      {task.completedAt && (
                        <small className="success">
                          Completed {dueLabel(task.completedAt)}
                        </small>
                      )}
                      {project.canEdit && (
                        <>
                          <label className="task-status">
                            Status
                            <select
                              aria-label={`Status for ${task.title}`}
                              value={task.status}
                              disabled={busy}
                              onChange={(e) =>
                                mutate(
                                  () =>
                                    api.patch(`${path}/tasks/${task.id}`, {
                                      status: e.target.value,
                                    }),
                                  "Task moved.",
                                )
                              }
                            >
                              {columns.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="actions task-actions">
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => setEditing(task)}
                            >
                              Edit
                            </button>
                            <button
                              className="secondary"
                              aria-label={`Move ${task.title} up`}
                              disabled={busy || index === 0}
                              onClick={() =>
                                mutate(
                                  () =>
                                    api.patch(`${path}/tasks/${task.id}`, {
                                      position: index - 1,
                                    }),
                                  "Task reordered.",
                                )
                              }
                            >
                              ↑
                            </button>
                            <button
                              className="secondary"
                              aria-label={`Move ${task.title} down`}
                              disabled={busy || index === tasks.length - 1}
                              onClick={() =>
                                mutate(
                                  () =>
                                    api.patch(`${path}/tasks/${task.id}`, {
                                      position: index + 1,
                                    }),
                                  "Task reordered.",
                                )
                              }
                            >
                              ↓
                            </button>
                            <button
                              className="danger-text"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(`Delete “${task.title}”?`)) {
                                  mutate(
                                    () =>
                                      api.delete(`${path}/tasks/${task.id}`),
                                    "Task deleted.",
                                  );
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
          <div className="settings-grid">
            <details className="panel" open>
              <summary>People · {project.collaborators.length + 1}</summary>
              <ul className="people-list">
                <li>
                  <span>{project.owner.username}</span>
                  <span className="badge">Owner</span>
                </li>
                {project.collaborators.map((c) => (
                  <li key={c.userId}>
                    <span>{c.user.username}</span>
                    {project.canManage ? (
                      <div className="actions">
                        <select
                          aria-label={`Permission for ${c.user.username}`}
                          value={c.permission}
                          disabled={busy}
                          onChange={(e) =>
                            mutate(
                              () =>
                                api.post(`${path}/collaborators`, {
                                  username: c.user.username,
                                  permission: e.target.value,
                                }),
                              "Permission updated.",
                            )
                          }
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                        <button
                          className="danger-text"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${c.user.username} from this project?`,
                              )
                            ) {
                              mutate(
                                () =>
                                  api.delete(
                                    `${path}/collaborators/${c.userId}`,
                                  ),
                                "Collaborator removed.",
                              );
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="badge">
                        {c.permission === "EDITOR" ? "Editor" : "Viewer"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {project.canManage && (
                <form
                  className="stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const values = Object.fromEntries(new FormData(form));

                    if (
                      await mutate(
                        () => api.post(`${path}/collaborators`, values),
                        "Collaborator saved.",
                      )
                    ) {
                      form.reset();
                    }
                  }}
                >
                  <label>
                    Invite by existing username
                    <input name="username" maxLength={200} required />
                  </label>
                  <label>
                    Permission
                    <select name="permission">
                      <option value="VIEWER">Viewer — can view tasks</option>
                      <option value="EDITOR">Editor — can manage tasks</option>
                    </select>
                  </label>
                  <button disabled={busy}>Add collaborator</button>
                </form>
              )}
            </details>
            {project.canManage && (
              <details className="panel">
                <summary>Project settings</summary>
                <form
                  className="stack settings-form"
                  key={project.updatedAt}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const values = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    mutate(() => api.patch(path, values), "Project saved.");
                  }}
                >
                  <label>
                    Name
                    <input
                      name="name"
                      maxLength={200}
                      defaultValue={project.name}
                      required
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      maxLength={10000}
                      defaultValue={project.description ?? ""}
                      rows={3}
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={project.dueDate?.slice(0, 10) ?? ""}
                    />
                  </label>
                  <button disabled={busy}>Save project</button>
                </form>
                <button
                  className="danger-text delete-project"
                  disabled={busy}
                  onClick={removeProject}
                >
                  Delete project
                </button>
              </details>
            )}
          </div>
        </>
      )}
    </section>
  );
}
