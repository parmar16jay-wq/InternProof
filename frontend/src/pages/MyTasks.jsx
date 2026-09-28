import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "";
const authHeaders = () => ({ Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` });
const label = (value) => (value || "assigned").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [histories, setHistories] = useState({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [description, setDescription] = useState("");
  const [github, setGithub] = useState("");
  const [live, setLive] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchTasks = async () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!user?.token) { window.location.href = "/login"; return; }
    const response = await fetch(`${API}/api/tasks/student/${user.user_id}`, { headers: authHeaders() });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(response.status === 401 ? "Your login session is missing or expired. Sign out, sign back in, then retry." : response.status >= 500 ? `The backend returned an error (${response.status}). Check the backend terminal for details.` : problem.detail || "Unable to load tasks.");
    }
    const data = await response.json(); setTasks(data);
    const pairs = await Promise.all(data.map(async (task) => {
      const result = await fetch(`${API}/api/tasks/${task.id}/submissions`, { headers: authHeaders() });
      return [task.id, result.ok ? await result.json() : []];
    }));
    setHistories(Object.fromEntries(pairs));
  };
  const load = () => { setLoading(true); setError(""); fetchTasks().catch((e) => setError(e instanceof TypeError ? "Cannot reach the backend through the frontend proxy. Confirm Uvicorn is running on port 8000 and restart Vite, then retry." : e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const startTask = async (task) => {
    setBusy(true); setError("");
    try { const res = await fetch(`${API}/api/tasks/${task.id}/start`, { method: "POST", headers: authHeaders() }); if (!res.ok) throw new Error((await res.json()).detail || "Unable to start task."); await fetchTasks(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!active) return;
    const body = new FormData(); body.append("description", description); if (file) body.append("evidence_file", file); body.append("github_url", github); body.append("live_url", live);
    setBusy(true); setError("");
    try { const res = await fetch(`${API}/api/tasks/${active.id}/submissions`, { method: "POST", headers: authHeaders(), body }); const data = await res.json(); if (!res.ok) throw new Error(data.detail || "Unable to submit task."); setActive(null); setDescription(""); setGithub(""); setLive(""); setFile(null); await fetchTasks(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const download = async (submission) => { const res = await fetch(`${API}/api/evidence/${submission.id}`, { headers: authHeaders() }); if (!res.ok) { setError("Unable to download evidence."); return; } const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = submission.evidence_file_name || "evidence"; a.click(); URL.revokeObjectURL(url); };
  const verifyIntegrity = async (submission) => { const res = await fetch(`${API}/api/task-submissions/${submission.id}/verify-integrity`, { headers: authHeaders() }); const data = await res.json(); if (res.ok) window.alert(data.message); else setError(data.detail || "Unable to verify file integrity."); };

  return <div className="container py-4">
    <div className="d-flex justify-content-between align-items-center mb-4"><div><h2 className="fw-bold mb-1">My Tasks</h2><p className="text-muted mb-0">Submit work for company review and track verified tasks.</p></div><Link to="/student/dashboard" className="btn btn-outline-primary">← Back to Dashboard</Link></div>
    {error && <div className="alert alert-danger d-flex justify-content-between align-items-center"><span>{error}</span><button className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button></div>}
    {loading ? <p>Loading your tasks...</p> : !error && tasks.length === 0 ? <div className="card"><div className="card-body text-center py-5"><h4>No Tasks Yet</h4><p className="text-muted mb-0">You don't have any tasks assigned to you yet.</p></div></div> : !error && <div className="row g-4">{tasks.map((task) => {
      const history = histories[task.id] || []; const latest = history[0];
      return <div className="col-md-6" key={task.id}><div className="card shadow-sm h-100"><div className="card-body">
        <div className="d-flex justify-content-between gap-2 mb-3"><h5 className="fw-bold">{task.title}</h5><span className={`badge ${task.status === "approved" ? "bg-success" : task.status === "changes_required" ? "bg-warning text-dark" : "bg-info text-dark"}`}>{label(task.status)}</span></div>
        <p className="text-muted">{task.description}</p><p><strong>Due date:</strong> {task.due_date || "No due date"}</p>
        {latest?.review_comment && <div className="alert alert-warning"><strong>Company feedback</strong><br />{latest.review_comment}</div>}
        {latest?.evidence_file_name && <p className="small text-muted mb-2">Latest evidence: {latest.evidence_file_name}</p>}
        {task.status === "assigned" && <button className="btn btn-primary" disabled={busy} onClick={() => startTask(task)}>Start Task</button>}
        {["in_progress", "changes_required"].includes(task.status) && <button className="btn btn-primary" onClick={() => { setActive(task); setDescription(""); setGithub(""); setLive(""); setFile(null); }}> {task.status === "changes_required" ? "Resubmit Task" : "Submit Task"}</button>}
        {task.status === "approved" && <p className="text-success fw-semibold mb-2">✓ Approved and verified by the company</p>}
        {history.length > 0 && <details className="mt-3"><summary className="fw-semibold">Submission history ({history.length})</summary><div className="mt-2">{history.map((submission, i) => <div className="border rounded p-2 mb-2" key={submission.id}><strong>Submission #{history.length - i}</strong> · {label(submission.status)}<div className="small text-muted">{new Date(submission.submitted_at).toLocaleString()}</div>{submission.evidence_file_name && <><button className="btn btn-sm btn-link px-0 me-3" onClick={() => download(submission)}>Download {submission.evidence_file_name}</button><button className="btn btn-sm btn-link px-0" onClick={() => verifyIntegrity(submission)}>Verify file integrity</button></>}{submission.review_comment && <div>{submission.review_comment}</div>}</div>)}</div></details>}
      </div></div></div>;
    })}</div>}
    {active && <div className="modal d-block" role="dialog" aria-modal="true" style={{ background: "rgba(0,0,0,.45)" }}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><div><h5 className="modal-title fw-bold">Submit Task</h5><div className="text-muted">{active.title} · Due {active.due_date || "No due date"}</div></div><button type="button" className="btn-close" onClick={() => setActive(null)} aria-label="Close" /></div><div className="modal-body"><p className="text-muted">{active.description}</p><label className="form-label fw-semibold">Submission description</label><textarea className="form-control mb-3" rows="4" minLength="10" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you completed (at least 10 characters)."/><label className="form-label fw-semibold">Evidence file (optional if a URL is provided)</label><input className="form-control mb-1" type="file" accept=".zip,.pdf,.docx,.pptx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} /><div className="form-text mb-3">ZIP, PDF, DOCX, PPTX, PNG or JPG · up to 10 MB. At least one evidence source is required.</div><label className="form-label">GitHub repository URL (optional)</label><input className="form-control mb-3" type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..."/><label className="form-label">Live project URL (optional)</label><input className="form-control" type="url" value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://..."/></div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setActive(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Submitting..." : "Submit for Review"}</button></div></form></div></div></div>}
  </div>;
}
export default MyTasks;

