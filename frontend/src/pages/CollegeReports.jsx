import { useEffect, useState } from "react";
import { LoadingSpinner, PageHeader, StatCard, DataTable } from "../UiComponents";

export default function CollegeReports() {
  const [summary, setSummary] = useState(null);
  const [internships, setInternships] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let token = "";
    try { token = JSON.parse(sessionStorage.getItem("user") || "{}").token || ""; } catch { /* no session */ }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([fetch("/api/college/overview", { headers }), fetch("/api/college/records/internships", { headers })])
      .then(async ([a, b]) => { const x = await a.json(); const y = await b.json(); if (!a.ok || !b.ok) throw new Error(x.detail || y.detail || "Unable to load reports."); setSummary(x); setInternships(y); })
      .catch((e) => setError(e.message));
  }, []);
  if (!summary && !error) return <LoadingSpinner label="Loading college reports…" />;
  const cards = summary ? [["Total students", summary.total_students], ["College verified", summary.verified_students], ["Pending students", summary.pending_student_verification], ["Total internships", summary.total_internships], ["Ongoing", summary.ongoing_internships], ["Completed", summary.completed_internships], ["Pending internship review", summary.pending_internship_verification], ["Certificates issued", summary.certificates_issued]] : [];
  const departments = [...new Set(internships.map((i) => i.department).filter(Boolean))].sort();
  return <div className="dashboard-page"><PageHeader eyebrow="COLLEGE WORKSPACE" title="Reports" description="A concise view of student, internship, verification, and certificate activity." />{error && <div className="alert alert-danger mt-3">{error}</div>}
    <div className="row g-3 mt-2">{cards.map(([label, value]) => <div className="col-6 col-xl-3" key={label}><StatCard label={label} value={value} /></div>)}</div>
    <section className="panel-card mt-3"><div className="panel-heading"><h2>Department internship summary</h2></div><DataTable headers={["Department", "Internships", "Ongoing", "Completed", "Pending college review"]}>{departments.map((department) => { const rows = internships.filter((i) => i.department === department); return <tr key={department}><td>{department}</td><td>{rows.length}</td><td>{rows.filter((i) => ["active", "ongoing"].includes(i.status)).length}</td><td>{rows.filter((i) => i.status === "completed").length}</td><td>{rows.filter((i) => i.college_verification === "pending").length}</td></tr>; })}{!departments.length && <tr><td colSpan="5" className="text-muted text-center">No department internship records yet.</td></tr>}</DataTable></section>
  </div>;
}
