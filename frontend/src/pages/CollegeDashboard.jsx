import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner, PageHeader, StatCard } from "../UiComponents";

const blank = { total_students: 0, verified_students: 0, pending_student_verification: 0, total_internships: 0, ongoing_internships: 0, completed_internships: 0, pending_internship_verification: 0, certificates_issued: 0, recent_activity: [] };

export default function CollegeDashboard() {
  const [data, setData] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let token = "";
    try { token = JSON.parse(sessionStorage.getItem("user") || "{}").token || ""; } catch { /* handled by app chrome */ }
    fetch("/api/college/overview", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.detail || "Unable to load college overview."); return body; })
      .then((body) => { if (active) setData(body); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <LoadingSpinner label="Loading college overview…" />;
  const stats = [
    ["Total Students", data.total_students, "Associated with this college", "/college/students"],
    ["Verified Students", data.verified_students, "College approved", "/college/students"],
    ["Pending Verification", data.pending_student_verification, "Requests to review", "/college/verification-requests"],
    ["Total Internships", data.total_internships, "Student internship records", "/college/internships"],
    ["Ongoing Internships", data.ongoing_internships, "Currently active", "/college/internships"],
    ["Completed Internships", data.completed_internships, "Marked complete", "/college/internships"],
    ["Pending Internship Review", data.pending_internship_verification, "Awaiting college decision", "/college/internships"],
    ["Certificates Issued", data.certificates_issued, "Student records", "/college/certificates"],
  ];
  return <div className="dashboard-page">
    <PageHeader eyebrow="COLLEGE OVERVIEW" title="College workspace" description="Verify student affiliation and review internship outcomes for your college." />
    {error && <div className="alert alert-danger mt-3">{error}</div>}
    <div className="row g-3 mt-2">{stats.map(([label, value, note, to]) => <div className="col-6 col-xl-3" key={label}><StatCard label={label} value={value} note={note} to={to} /></div>)}</div>
    <section className="panel-card mt-3">
      <div className="panel-heading"><div><span className="section-eyebrow">COLLEGE ACTIVITY</span><h2>Recent activity</h2></div><Link to="/college/verification-requests">Review requests ↗</Link></div>
      {data.recent_activity.length ? data.recent_activity.map((item, i) => <div className="activity-row" key={`${item.type}-${i}`}><span className="activity-symbol">{item.type === "student" ? "S" : "I"}</span><span className="activity-copy"><b>{item.label}</b><small>{item.at ? new Date(item.at).toLocaleDateString() : "Recently"}</small></span></div>) : <div className="empty-inline"><b>No recent activity</b><span>New student verification requests and internship reviews will appear here.</span></div>}
    </section>
  </div>;
}
