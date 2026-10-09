import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, LoadingSpinner, PageHeader, StatusBadge } from "../UiComponents";

const API = "/api/college";
const config = {
  students: { title: "Students", type: "students", search: "Search name, roll number, or email", columns: ["Student", "Roll number", "Email", "College", "Department", "Course", "Year", "Semester", "Verification", "Profile"] },
  requests: { title: "Verification Requests", type: "requests", search: "Search student, roll number, or email", columns: ["Student", "Roll number", "Email", "Department", "Course", "Year", "Semester", "Verification", "Actions"] },
  internships: { title: "Internships", type: "internships", search: "Search student, roll number, company, or role", columns: ["Student", "Roll number", "Company", "Position", "Dates", "Status", "Mentor", "College review", "Certificate"] },
  evaluations: { title: "Mentor Evaluations", type: "evaluations", search: "Search student, roll number, company, or mentor", columns: ["Student", "Roll number", "Company / internship", "Mentor", "Evaluation", "Rating", "Tasks", "Approval"] },
  applications: { title: "Applications", type: "applications", search: "Search student, roll number, company, or position", columns: ["Student", "Roll number", "Company", "Position", "Applied", "Status"] },
  certificates: { title: "Certificates", type: "certificates", search: "Search student, roll number, company, or certificate number", columns: ["Student", "Roll number", "Company", "Internship", "Certificate number", "Issue date", "Status", "Actions"] },
};

export default function CollegeRecords({ section }) {
  const sectionConfig = config[section];
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [internshipStatus, setInternshipStatus] = useState("");
  const [studentDetails, setStudentDetails] = useState(null);
  const [openStudent, setOpenStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = useMemo(() => { try { return JSON.parse(sessionStorage.getItem("user") || "{}").token || ""; } catch { return ""; } }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/records/${sectionConfig.type}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load college records.");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [sectionConfig.type, token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const action = async (url) => {
    const response = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) { setError(data.detail || "Unable to save the review."); return; }
    setError(""); await load();
  };
  const requestEvaluation = async (row) => {
    const response = await fetch(`${API}/internships/${row.internship_id}/evaluation-request?student_id=${row.student_id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) { setError(data.detail || "Unable to request the mentor evaluation."); return; }
    setError(""); await load();
  };
  const toggleStudent = async (id) => {
    if (openStudent === id) { setOpenStudent(null); return; }
    setOpenStudent(id); setStudentDetails(null);
    try { const response = await fetch(`${API}/students/${id}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Unable to load student details."); setStudentDetails(data); }
    catch (err) { setError(err.message); }
  };
  const downloadCertificate = async (row) => {
    try {
      const response = await fetch(`${API}/certificates/file/${row.student_id}/${row.internship_id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.detail || "Unable to download certificate."); }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `${row.certificate_number}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  };
  const viewCertificate = async (row) => {
    const tab = window.open("about:blank", "_blank");
    try {
      const response = await fetch(`${API}/certificates/file/${row.student_id}/${row.internship_id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.detail || "Unable to view certificate."); }
      const url = URL.createObjectURL(await response.blob());
      if (tab) tab.location.href = url; else window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { tab?.close(); setError(err.message); }
  };
  const visible = rows.filter((row) => {
    const haystack = Object.values(row).filter((v) => v !== null && typeof v !== "object").join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!department || row.department === department) && (!course || row.course === course) && (!year || row.year === year) && (!company || row.company === company) && (!internshipStatus || row.status === internshipStatus) && (!status || String(row.college_verification_status || row.approval_status || row.college_verification || row.status).toLowerCase() === status.toLowerCase());
  });
  const unique = (key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort();

  if (loading) return <LoadingSpinner label={`Loading ${sectionConfig.title.toLowerCase()}…`} />;
  return <div className="dashboard-page">
    <PageHeader eyebrow="COLLEGE WORKSPACE" title={sectionConfig.title} description="Review records associated with your registered college." />
    {error && <div className="alert alert-danger mt-3">{error}</div>}
    <section className="panel-card mt-3">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <input className="form-control flex-grow-1" style={{ minWidth: 250 }} type="search" placeholder={sectionConfig.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        {["students", "requests", "internships"].includes(section) && <>
          <select className="form-select w-auto" value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All departments</option>{unique("department").map((v) => <option key={v}>{v}</option>)}</select>
          <select className="form-select w-auto" value={course} onChange={(e) => setCourse(e.target.value)}><option value="">All courses</option>{unique("course").map((v) => <option key={v}>{v}</option>)}</select>
          <select className="form-select w-auto" value={year} onChange={(e) => setYear(e.target.value)}><option value="">All years</option>{unique("year").map((v) => <option key={v}>{v}</option>)}</select>
        </>}
        {section === "internships" && <><select className="form-select w-auto" value={company} onChange={(e) => setCompany(e.target.value)}><option value="">All companies</option>{unique("company").map((v) => <option key={v}>{v}</option>)}</select><select className="form-select w-auto" value={internshipStatus} onChange={(e) => setInternshipStatus(e.target.value)}><option value="">All internship statuses</option>{unique("status").map((v) => <option key={v}>{v}</option>)}</select></>}
        <select className="form-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{unique(section === "internships" ? "college_verification" : section === "evaluations" ? "approval_status" : section === "certificates" ? "status" : section === "applications" ? "status" : "college_verification_status").map((v) => <option key={v}>{v}</option>)}</select>
      </div>
      <DataTable headers={sectionConfig.columns}>
        {visible.map((row) => <Fragment key={row.id}><tr>
          {section === "students" && <><td><b>{row.full_name}</b></td><td>{row.roll_number || "—"}</td><td>{row.email}</td><td>{row.college} <small className="d-block">{row.college_code}</small></td><td>{row.department || "—"}</td><td>{row.course || "—"}</td><td>{row.year || "—"}</td><td>{row.semester || "—"}</td><td><StatusBadge status={row.college_verification_status} /></td><td><button className="btn btn-sm btn-outline-primary" onClick={() => toggleStudent(row.id)}>{openStudent === row.id ? "Close" : "View"}</button></td></>}
          {section === "requests" && <><td><b>{row.full_name}</b></td><td>{row.roll_number || "?"}</td><td>{row.email}</td><td>{row.department || "?"}</td><td>{row.course || "?"}</td><td>{row.year || "?"}</td><td>{row.semester || "?"}</td><td><StatusBadge status={row.college_verification_status} /></td><td>{row.college_verification_status === "pending" ? <div className="d-flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => action(`${API}/students/${row.id}/verification?status=verified`)}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => action(`${API}/students/${row.id}/verification?status=rejected`)}>Reject</button></div> : <span className="text-muted">No action needed</span>}</td></>}
          {section === "internships" && <><td><b>{row.student_name}</b></td><td>{row.roll_number || "—"}</td><td>{row.company}</td><td>{row.role}</td><td>{row.start_date || "—"} – {row.end_date || "—"}</td><td><StatusBadge status={row.status} /></td><td><StatusBadge status={row.mentor_approval} /></td><td><StatusBadge status={row.college_verification} />{row.college_verification !== "verified" && <div className="d-flex gap-1 mt-2"><button className="btn btn-sm btn-outline-primary" onClick={() => action(`${API}/internships/${row.id}/verification?student_id=${row.student_id}&status=verified`)}>Verify</button><button className="btn btn-sm btn-outline-danger" onClick={() => action(`${API}/internships/${row.id}/verification?student_id=${row.student_id}&status=rejected`)}>Reject</button></div>}</td><td>{row.certificate_available ? "Available" : "Pending"}</td></>}
          {section === "evaluations" && <><td><b>{row.student_name}</b></td><td>{row.roll_number || "—"}</td><td>{row.company}<small className="d-block">{row.internship}</small></td><td>{row.mentor}</td><td>{row.evaluation || "Awaiting company evaluation"}</td><td>{row.rating ? `${row.rating}/5` : "—"}</td><td>{row.tasks_completed ?? "—"}/{row.tasks_total ?? "—"}</td><td><StatusBadge status={row.approval_status} />{["not_requested", "rejected"].includes(row.approval_status) && <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => requestEvaluation(row)}>{row.approval_status === "rejected" ? "Request revision" : "Request evaluation"}</button>}{row.approval_status === "pending" && row.evaluation && <div className="d-flex gap-1 mt-2"><button className="btn btn-sm btn-primary" onClick={() => action(`${API}/internships/${row.internship_id}/evaluation-decision?student_id=${row.student_id}&status=approved`)}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => action(`${API}/internships/${row.internship_id}/evaluation-decision?student_id=${row.student_id}&status=rejected`)}>Reject</button></div>}</td></>}
          {section === "applications" && <><td><b>{row.student_name}</b></td><td>{row.roll_number || "—"}</td><td>{row.company}</td><td>{row.internship}</td><td>{row.applied_at ? new Date(row.applied_at).toLocaleDateString() : "—"}</td><td><StatusBadge status={row.status} /></td></>}
          {section === "certificates" && <><td><b>{row.student_name}</b></td><td>{row.roll_number || "—"}</td><td>{row.company}</td><td>{row.internship}</td><td>{row.certificate_number}</td><td>{row.issue_date || "—"}</td><td><StatusBadge status={row.status} /></td><td className="d-flex gap-1">{row.evaluation_approved ? <><button className="btn btn-sm btn-outline-primary" onClick={() => viewCertificate(row)}>View</button><button className="btn btn-sm btn-primary" onClick={() => downloadCertificate(row)}>Download</button></> : <span className="small text-muted">Waiting for approved evaluation</span>}</td></>}
        </tr>{section === "students" && openStudent === row.id && <tr><td colSpan={sectionConfig.columns.length}><div className="p-3 bg-light rounded">{!studentDetails ? <span>Loading student profile…</span> : <><div className="row g-3 mb-3"><div className="col-md-6"><b>College verification</b><div><StatusBadge status={studentDetails.college_verification_status} />{studentDetails.college_verified_at && <small className="ms-2">Reviewed {new Date(studentDetails.college_verified_at).toLocaleDateString()}</small>}</div>{studentDetails.college_rejection_reason && <small>{studentDetails.college_rejection_reason}</small>}</div><div className="col-md-6"><b>Academic record</b><div>{studentDetails.department || "—"} · {studentDetails.course || "—"} · {studentDetails.year || "—"} · Semester {studentDetails.semester || "—"}</div></div></div><b>Internship history</b>{studentDetails.internship_history.length ? studentDetails.internship_history.map((item) => <div className="border-top py-2 mt-2" key={item.internship_id}><b>{item.role}</b> · {item.company} · {item.start_date || "—"} – {item.end_date || "—"}<div className="small">Application: {item.application_status} · Mentor: {item.mentor || "Not submitted"} {item.mentor_rating ? `(${item.mentor_rating}/5)` : ""} · Mentor approval: {item.mentor_approval} · College review: {item.college_verification} · Certificate: {item.certificate_number || "Not issued"}</div>{item.mentor_evaluation && <div className="small mt-1">{item.mentor_evaluation}</div>}</div>) : <p className="small text-muted mb-0 mt-2">No internship history yet.</p>}</>}</div></td></tr>}</Fragment>)}
        {!visible.length && <tr><td colSpan={sectionConfig.columns.length} className="text-center text-muted py-4">{section === "requests" ? "No students match your search and filters." : "No matching records found."}</td></tr>}
      </DataTable>
      <div className="small text-muted">Showing {visible.length} of {rows.length} records</div>
    </section>
  </div>;
}
