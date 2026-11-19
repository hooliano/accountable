import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, dueLabel, errorMessage } from "../api.js";

export default function FriendProfile() {
  const { userId } = useParams();
  const [friend, setFriend] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([api.get("/friends"), api.get(`/friends/${userId}/projects`)])
      .then(([friendsRes, projectsRes]) => {
        if (!active) {
          return;
        }
        setFriend(
          friendsRes.data.friends.find((f) => f.id === Number(userId)) ?? null,
        );
        setProjects(projectsRes.data.projects);
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
  }, [userId]);

  if (loading) {
    return <p role="status">Loading profile…</p>;
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.taskCount, 0);
  const doneTasks = projects.reduce((sum, p) => sum + p.completedCount, 0);

  return (
    <section>
      <Link className="back-link" to="/friends">
        ← Back to friends
      </Link>

      {error || !friend ? (
        <div className="panel empty">
          <h2>Can't view this profile</h2>
          <p>{error || "You're not friends with this user."}</p>
        </div>
      ) : (
        <>
          <h1>{friend.username}</h1>
          <p className="muted">
            Friends since {new Date(friend.friendsSince).toLocaleDateString()} ·{" "}
            {doneTasks} of {totalTasks} tasks done across {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
          </p>

          {projects.length ? (
            <div className="project-list friend-projects">
              {projects.map((project) => (
                <div className="panel" key={project.id}>
                  <h2>{project.name}</h2>
                  {project.description && (
                    <p className="description">{project.description}</p>
                  )}
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={project.progress}
                    aria-label={`${project.name} progress`}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="muted">
                    {project.completedCount} of {project.taskCount} tasks done ·{" "}
                    {project.progress}%
                  </p>
                  <small>{dueLabel(project.dueDate)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel empty friend-projects">
              <h2>No projects yet</h2>
              <p>{friend.username} hasn't started any projects.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}