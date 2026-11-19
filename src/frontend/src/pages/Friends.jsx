import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api.js";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  async function load() {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests"),
      ]);
      setFriends(friendsRes.data.friends);
      setIncoming(requestsRes.data.incoming);
      setOutgoing(requestsRes.data.outgoing);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function act(request) {
    setError("");
    setNotice("");
    try {
      const { data } = await request();
      if (data?.message) {
        setNotice(data.message);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function removeFriend(friend) {
    if (window.confirm(`Remove ${friend.username} from your friends?`)) {
      act(() => api.delete(`/friends/${friend.id}`));
    }
  }

  function sendRequest(user) {
    act(() => api.post("/friends/requests", { username: user.username }));
  }

  function acceptRequest(user) {
    act(() => api.post(`/friends/requests/${user.id}/accept`));
  }

  function removeRequest(user) {
    act(() => api.delete(`/friends/requests/${user.id}`));
  }

  async function search(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSearching(true);
    try {
      const { data } = await api.get("/friends/search", {
        params: { q: query },
      });
      setResults(data.users);
      setSearched(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  const friendIds = new Set(friends.map((f) => f.id));
  const incomingIds = new Set(incoming.map((r) => r.user.id));
  const outgoingIds = new Set(outgoing.map((r) => r.user.id));

  function searchAction(result) {
    if (friendIds.has(result.id)) {
      return <small>Friends</small>;
    }
    if (outgoingIds.has(result.id)) {
      return <small>Request sent</small>;
    }
    if (incomingIds.has(result.id)) {
      return <button onClick={() => acceptRequest(result)}>Accept</button>;
    }
    return (
      <button className="secondary" onClick={() => sendRequest(result)}>
        Add friend
      </button>
    );
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
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="project-layout">
        <div className="stack">
          {(incoming.length > 0 || outgoing.length > 0) && (
            <div className="panel">
              <h2>Friend requests</h2>
              {incoming.length > 0 && (
                <>
                  <h3>Received</h3>
                  <ul className="people-list">
                    {incoming.map((request) => (
                      <li key={request.user.id}>
                        <span>
                          {request.user.username}
                          <br />
                          <small>
                            Sent {new Date(request.sentAt).toLocaleDateString()}
                          </small>
                        </span>
                        <div className="actions">
                          <button onClick={() => acceptRequest(request.user)}>
                            Accept
                          </button>
                          <button
                            className="secondary"
                            onClick={() => removeRequest(request.user)}
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {outgoing.length > 0 && (
                <>
                  <h3>Sent</h3>
                  <ul className="people-list">
                    {outgoing.map((request) => (
                      <li key={request.user.id}>
                        <span>
                          {request.user.username}
                          <br />
                          <small>
                            Sent {new Date(request.sentAt).toLocaleDateString()}
                          </small>
                        </span>
                        <button
                          className="secondary"
                          onClick={() => removeRequest(request.user)}
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="panel">
            <h2>Your friends</h2>
            {loading ? (
              <p role="status">Loading friends…</p>
            ) : friends.length ? (
              <ul className="people-list">
                {friends.map((friend) => (
                  <li key={friend.id}>
                    <span>
                      <Link to={`/friends/${friend.id}`}>
                        {friend.username}
                      </Link>
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

        <div className="panel stack">
          <h2>Find people</h2>
          <form className="stack" onSubmit={search}>
            <label>
              Username
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                minLength={2}
                maxLength={50}
                placeholder="At least 2 characters"
                required
              />
            </label>
            <button disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searched &&
            (results.length ? (
              <ul className="people-list">
                {results.map((result) => (
                  <li key={result.id}>
                    <span>{result.username}</span>
                    {searchAction(result)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No users found.</p>
            ))}
        </div>
      </div>
    </section>
  );
}