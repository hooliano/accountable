import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, dueLabel, errorMessage } from "../api.js";

export default function Home({ user }) {
  if (user) {
    return <Projects key={user.id} />;
  }

  return (
    <section>
      <h1>Welcome to Accountable</h1>
      <p>Track your goals. Bring your friends along.</p>
      <Link className="nav-button welcome-link" to="/register">
        Get started
      </Link>
    </section>
  );
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    api
      .get("/projects")
      .then(({ data }) => {
        if (active) {
          setProjects(data.projects);
        }
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await api.post(
        "/projects",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      navigate(`/projects/${data.project.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>Your projects</h1>
      <p className="muted">
        A little progress, together. Open a project to manage its tasks.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="project-layout">
        <div>
          {loading ? (
            <p role="status">Loading projects…</p>
          ) : projects.length ? (
            <div className="project-list">
              {projects.map((project) => (
                <Link
                  className="panel project-link"
                  to={`/projects/${project.id}`}
                  key={project.id}
                >
                  <h2>{project.name}</h2>
                  {project.description && (
                    <p className="description">{project.description}</p>
                  )}
                  <p className="muted">
                    {project._count.tasks} tasks · Owner:{" "}
                    {project.owner.username}
                  </p>
                  <small>{dueLabel(project.dueDate)}</small>
                </Link>
              ))}
            </div>
          ) : (
            !error && (
              <div className="panel empty">
                <h2>No projects yet</h2>
                <p>
                  Create your first project, or ask a friend to add you as a
                  collaborator.
                </p>
              </div>
            )
          )}
        </div>
        <form className="panel stack" onSubmit={create}>
          <h2>New project</h2>
          <label>
            Name
            <input name="name" maxLength={200} required />
          </label>
          <label>
            Description
            <textarea name="description" maxLength={10000} rows={3} />
          </label>
          <label>
            Due date
            <input name="dueDate" type="date" />
          </label>
          <button disabled={saving}>
            {saving ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>
    </section>
  );
}
