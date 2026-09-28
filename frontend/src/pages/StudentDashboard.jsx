import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../UiComponents";

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let loggedInUser;
    try { loggedInUser = JSON.parse(sessionStorage.getItem("user") || "null"); } catch { loggedInUser = null; }
    if (!loggedInUser) { window.location.href = "/login"; return; }
    setUser(loggedInUser);
    const studentId = loggedInUser.user_id;
    Promise.all([
      fetch("/api/internships"),
      fetch(`/api/applications/student/${studentId}`),
      fetch(`/api/tasks/student/${studentId}`, { headers: { Authorization: `Bearer ${loggedInUser.token || ""}` } }),
      fetch(`/api/certificates/student/${studentId}`)
    ]).then(async ([i,a,t,c]) => {
      if (i.ok) setInternships(await i.json());
      if (a.ok) setApplications(await a.json());
      if (t.ok) setTasks(await t.json());
      if (c.ok) setCertificates(await c.json());
    }).catch((error) => console.error("Error loading dashboard:", error)).finally(() => setLoading(false));
  }, []);
  const complete = tasks.filter((task) => task.status === "approved").length;
  const progress = tasks.length ? Math.round(complete / tasks.length * 100) : 0;
  const accepted = applications.filter((item) => item.status === "accepted");
  if (loading) return <div className="page-loading"><div className="spinner-border text-primary" role="status"/><span>Loading your workspaceâ€¦</span></div>;
  return <div className="dashboard-page">
    <div className="page-heading-row"><div><span className="section-eyebrow">YOUR CAREER JOURNEY</span><h1 className="mt-2">Welcome back, {user?.full_name?.split(" ")[0] || "there"}.</h1><p className="text-muted mb-0">Hereâ€™s whatâ€™s happening with your internship experience.</p></div><Link to="/student/internships" className="btn btn-primary">Explore internships <span className="ms-2">â†—</span></Link></div>
    <div className="row g-3 mt-2">{[["Applications", applications.length, "Across your internship search", "/student/applications"],["Accepted placement", accepted.length, accepted[0]?.status || "Keep an eye on updates", "/student/internship"],["Open tasks", tasks.length - complete, `${complete} company approved`, "/student/tasks"],["Certificates", certificates.length, "Verified achievements", "/student/certificate"]].map(([label,value,note,to])=><div className="col-6 col-xl-3" key={label}><Link to={to} className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small><i>â†—</i></Link></div>)}</div>
    <div className="row g-3 mt-1"><div className="col-lg-7"><section className="panel-card h-100"><div className="panel-heading"><div><span className="section-eyebrow">YOUR ACTIVITY</span><h2>Recent applications</h2></div><Link to="/student/applications">View all â†—</Link></div>{applications.length ? <div className="activity-list">{applications.slice(0,5).map((application) => {const internship=internships.find((item)=>item.id===application.internship_id);return <div className="activity-row" key={application.id}><span className="activity-symbol">IP</span><span className="activity-copy"><b>{internship?.title || application.internship_title || `Internship #${application.internship_id}`}</b><small>{internship?.company_name || "Application submitted"}</small></span><StatusBadge status={application.status}/></div>})}</div>:<div className="empty-inline"><b>Your application journey starts here</b><span>Explore available internships and submit your first application.</span><Link to="/student/internships" className="btn btn-primary btn-sm">Browse internships</Link></div>}</section></div>
      <div className="col-lg-5"><section className="panel-card progress-panel"><div className="panel-heading"><div><span className="section-eyebrow">INTERNSHIP PROGRESS</span><h2>Your momentum</h2></div><Link to="/student/progress">Details â†—</Link></div><div className="progress-number">{progress}<small>%</small></div><div className="progress track-progress"><div className="progress-bar" style={{width:`${progress}%`}}/></div><div className="d-flex justify-content-between mt-2 small text-muted"><span>{complete} tasks approved</span><span>{tasks.length} total</span></div><div className="progress-footnote">{tasks.length ? "Only company approved work contributes to your verified progress." : "Your progress will appear here when tasks are assigned."}</div><Link to="/student/tasks" className="btn btn-outline-primary btn-sm mt-3">View my tasks</Link></section></div>
    </div>
    <div className="row g-3 mt-1"><div className="col-lg-7"><section className="panel-card"><div className="panel-heading"><div><span className="section-eyebrow">OPPORTUNITIES</span><h2>Explore internships</h2></div><Link to="/student/internships">Browse all â†—</Link></div>{internships.length ? internships.slice(0,3).map((item)=><div className="opportunity-row" key={item.id}><div><b>{item.title}</b><small>{item.company_name || "Company"} Â· {item.location || "Location not listed"}</small></div><Link to="/student/internships" aria-label={`Explore ${item.title}`}>â†—</Link></div>):<div className="empty-inline"><span>No internships are available right now.</span></div>}</section></div><div className="col-lg-5"><section className="panel-card h-100"><div className="panel-heading"><div><span className="section-eyebrow">NEXT STEPS</span><h2>Keep it moving</h2></div></div><div className="quick-links"><Link to="/student/messages"><span>Stay in touch</span><small>Open your conversations</small><b>â†—</b></Link><Link to="/student/certificate"><span>Your achievements</span><small>Review issued certificates</small><b>â†—</b></Link></div></section></div></div>
  </div>;
}
export default StudentDashboard;

