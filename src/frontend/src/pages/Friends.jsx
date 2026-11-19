import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api.js";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadFriends() {
    return api
      .get("/friends")
      .then(({ data }) => setFriends(data.friends))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    loadFriends().finally(() => setLoading(false));
  }, []);

  async function removeFriend(friend) {
    if (!window.confirm(`Remove ${friend.username} from your friends?`)) {
      return;
    }
    setError("");
    try {
      await api.delete(`/friends/${friend.id}`);
      setFriends((current) => current.filter((f) => f.id !== friend.id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section>
      <h1>Friends</h1>
      <p className="muted">
        Friends can see your projects and how far you've come.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="project-layout">
        <div className="panel">
          <h2>Your friends</h2>
          {loading ? (
            <p role="status">Loading friends…</p>
          ) : friends.length ? (
            <ul className="people-list">
              {friends.map((friend) => (
                <li key={friend.id}>
                  <span>
                    <Link to={`/friends/${friend.id}`}>{friend.username}</Link>
                    <br />
                    <small>
                      Friends since{" "}
                      {new Date(friend.friendsSince).toLocaleDateString()}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    onClick={() => removeFriend(friend)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p>No friends yet. Search for someone to add them.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}