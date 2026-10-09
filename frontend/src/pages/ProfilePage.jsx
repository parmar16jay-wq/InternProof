import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "../UiComponents";

const API = "http://127.0.0.1:8000/api";
const roles = { student: "Student", company: "Company", college: "College" };

async function getList(path) {
  let token = "";
  try { token = JSON.parse(sessionStorage.getItem("user") || "{}").token || ""; } catch { /* no session */ }
  const response = await fetch(API + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error("Request failed: " + response.status);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response");
  return data;
}

const valueOf = (result) => result.status === "fulfilled" ? result.value : null;
const initialsOf = (name = "") => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "U";

async function loadStudent(userId) {
  const results = await Promise.allSettled([
    getList("/applications/student/" + userId),
    getList("/internships"),
    getList("/tasks/student/" + userId),
    getList("/certificates/student/" + userId),
  ]);
  const [applications, internships, tasks, certificates] = results.map(valueOf);
  const accepted = applications?.filter((item) => item.status === "accepted") || [];
  const currentApplication = accepted.find((app) => internships?.some((item) => item.id === app.internship_id));
  const current = currentApplication ? internships.find((item) => item.id === currentApplication.internship_id) : null;
  const currentTasks = current ? tasks?.filter((task) => task.internship_id === current.id) || [] : [];
  return {
    stats: [
      { label: "Applications", value: applications?.length ?? null },
      { label: "Active internship", value: applications && internships ? (current ? 1 : 0) : null },
      { label: "Tasks completed", value: tasks?.filter((task) => task.status === "completed").length ?? null },
      { label: "Certificates", value: certificates?.length ?? null },
    ],
    failed: results.some((result) => result.status === "rejected"),
    activity: { applications: applications || [], applicationsLoaded: Boolean(applications), internships: internships || [] },
    current: current ? {
      ...current,
      completed: currentTasks.filter((task) => task.status === "completed").length,
      total: currentTasks.length,
      tasksAvailable: Boolean(tasks),
      certificate: certificates ? certificates.some((item) => item.internship_id === current.id) : null,
    } : null,
    currentUnavailable: !applications || !internships,
  };
}

async function loadCompany(userId) {
  let internships;
  try {
    internships = (await getList("/internships")).filter((item) => Number(item.created_by) === Number(userId));
  } catch {
    return { failed: true, activity: null, stats: [
      { label: "Internships posted", value: null }, { label: "Applications", value: null },
      { label: "Accepted students", value: null }, { label: "Certificates", value: null },
    ] };
  }
  const appResults = await Promise.allSettled(internships.map((item) => getList("/applications/internship/" + item.id)));
  const applications = appResults.flatMap(valueOf).filter(Boolean);
  const appsLoaded = appResults.every((result) => result.status === "fulfilled");
  const accepted = applications.filter((item) => item.status === "accepted");
  const studentIds = [...new Set(accepted.map((item) => item.student_id))];
  const certificateResults = await Promise.allSettled(studentIds.map((id) => getList("/certificates/student/" + id)));
  const certificates = certificateResults.flatMap(valueOf).filter(Boolean).filter((certificate) => internships.some((item) => item.id === certificate.internship_id));
  const certsLoaded = certificateResults.every((result) => result.status === "fulfilled");
  return {
    failed: !appsLoaded || !certsLoaded,
    activity: { internships, applications, applicationsLoaded: appsLoaded, certificates: appsLoaded && certsLoaded ? certificates.length : null },
    stats: [
      { label: "Internships posted", value: internships.length },
      { label: "Applications received", value: appsLoaded ? applications.length : null },
      { label: "Accepted students", value: appsLoaded ? studentIds.length : null },
      { label: "Certificates issued", value: appsLoaded && certsLoaded ? certificates.length : null },
    ],
  };
}

async function loadCollege() {
  const response = await fetch(API + "/college/overview", { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } });
  if (!response.ok) throw new Error("Unable to load college profile summary.");
  const summary = await response.json();
  return { failed: false, activity: null, stats: [
    { label: "Students", value: summary.total_students },
    { label: "Verified students", value: summary.verified_students },
    { label: "Pending verification", value: summary.pending_student_verification },
    { label: "Internships", value: summary.total_internships },
    { label: "Certificates", value: summary.certificates_issued },
  ] };
}

function ProfileSummary({ user, role }) {
  const [photo, setPhoto] = useState("");
  const [savedPhoto, setSavedPhoto] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const nameLabel = role === "company" ? "Company name" : role === "college" ? "College name" : "Full name";

  useEffect(() => {
    try {
      const storedPhoto = localStorage.getItem("profilePhoto_" + user.user_id) || "";
      setPhoto(storedPhoto);
      setSavedPhoto(storedPhoto);
    } catch {
      setMessage("This browser could not access local profile photo storage.");
    }
  }, [user.user_id]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file to use as your profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        setMessage("");
      }
    };
    reader.onerror = () => setMessage("The image could not be read. Please choose another file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const savePhoto = () => {
    try {
      const key = "profilePhoto_" + user.user_id;
      if (photo) localStorage.setItem(key, photo);
      else localStorage.removeItem(key);
      setSavedPhoto(photo);
      setEditing(false);
      setMessage("Profile photo saved in this browser.");
    } catch {
      setMessage("The photo could not be saved. Try a smaller image or remove another saved photo.");
    }
  };

  const cancelEdit = () => {
    setPhoto(savedPhoto);
    setEditing(false);
    setMessage("");
  };

  return <section className="panel-card profile-summary-card">
    <span className="section-eyebrow">PROFILE SUMMARY</span>
    <div className="profile-avatar">{photo ? <img src={photo} alt={user.full_name + " profile"} /> : initialsOf(user.full_name)}</div>
    <h2>{user.full_name || "Name unavailable"}</h2>
    <span className="profile-role-badge">{roles[role]}</span>
    <p className="profile-email">{user.email || "Email unavailable"}</p>
    {!editing ? <button className="btn btn-outline-primary" type="button" onClick={() => { setMessage(""); setEditing(true); }}>Edit Profile</button> : <>
      <label className="btn btn-outline-primary profile-photo-picker" htmlFor={"profile-photo-" + user.user_id}>{photo ? "Choose another photo" : "Choose profile photo"}</label>
      <input id={"profile-photo-" + user.user_id} className="visually-hidden" type="file" accept="image/*" onChange={handlePhotoChange} />
      {photo && <button className="btn btn-link profile-remove-photo" type="button" onClick={() => { setPhoto(""); setMessage(""); }}>Remove photo</button>}
      <div className="d-flex gap-2 mt-2"><button className="btn btn-primary" type="button" onClick={savePhoto}>Save photo</button><button className="btn btn-light" type="button" onClick={cancelEdit}>Cancel</button></div>
    </>}
    <p className="profile-note">Only the profile photo can be changed here. Name and email are read-only because the account API does not support profile updates.</p>
    {message && <p className="profile-photo-message" role="status">{message}</p>}
    <span className="visually-hidden">{nameLabel}</span>
  </section>;
}

function AccountInformation({ user, role }) {
  const nameLabel = role === "company" ? "Company name" : role === "college" ? "College name" : "Full name";
  const rows = [[nameLabel, user.full_name], ["Email address", user.email], ["User ID", user.user_id], ["Role", roles[role]]];
  if (role === "college") rows.push(["College code", user.college_code]);
  if (role === "company") rows.push(["Company code", user.company_code]);
  if (role === "student" && user.college_id) rows.push(["College", user.college_name], ["College code", user.college_code], ["Roll number / Student ID", user.roll_number], ["Department", user.department], ["Course", user.course], ["Year", user.year], ["Semester", user.semester], ["College verification", user.college_verification_status === "verified" ? "College Verified" : user.college_verification_status === "rejected" ? "Rejected" : "Pending College Verification"]);
  return <section className="panel-card profile-information-card">
    <div className="panel-heading"><div><span className="section-eyebrow">ACCOUNT INFORMATION</span><h2>Personal details</h2></div></div>
    <div className="profile-information-list">{rows.map(([label, value]) => <div className="profile-information-row" key={label}><span>{label}</span><strong>{value || "Not provided"}</strong></div>)}</div>
  </section>;
}

function StudentCollegeAffiliation({ user, onUserChange }) {
  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState({ college_id: user.college_id || "", roll_number: user.roll_number || "", department: user.department || "", course: user.course || "", year: user.year || "", semester: user.semester || "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(API + "/colleges").then((r) => r.ok ? r.json() : []).then(setColleges).catch(() => setColleges([])); }, []);
  const update = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/student/college-affiliation", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token || ""}` }, body: JSON.stringify({ ...form, college_id: Number(form.college_id) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.detail || "Unable to submit academic details.");
      setMessage("Details submitted. Your college must approve the request before you are marked College Verified.");
      const current = await fetch(API + "/auth/me", { headers: { Authorization: `Bearer ${user.token || ""}` } });
      if (current.ok) { const next = { ...user, ...await current.json() }; sessionStorage.setItem("user", JSON.stringify(next)); onUserChange(next); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="panel-card mt-3"><div className="panel-heading"><div><span className="section-eyebrow">STUDENT AFFILIATION</span><h2>College and academic details</h2></div></div><p className="text-muted">Selecting a college submits a verification request. It does not automatically verify your affiliation.</p>{error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
    <form className="row g-3" onSubmit={save}><div className="col-md-6"><label className="form-label">Registered college</label><select className="form-select" name="college_id" value={form.college_id} onChange={update} required><option value="">Select a college</option>{colleges.map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.college_code}</option>)}</select></div><div className="col-md-6"><label className="form-label">Roll number / Student ID</label><input className="form-control" name="roll_number" value={form.roll_number} onChange={update} required /></div><div className="col-md-6"><label className="form-label">Department</label><input className="form-control" name="department" value={form.department} onChange={update} required /></div><div className="col-md-6"><label className="form-label">Course / Program</label><input className="form-control" name="course" value={form.course} onChange={update} required /></div><div className="col-md-6"><label className="form-label">Year (FY, SY, TY, etc.)</label><input className="form-control" name="year" value={form.year} onChange={update} required /></div><div className="col-md-6"><label className="form-label">Semester</label><input className="form-control" name="semester" value={form.semester} onChange={update} required /></div><div className="col-12"><button className="btn btn-primary" disabled={busy}>{busy ? "Submitting…" : "Submit for college verification"}</button>{user.college_id && <span className="ms-3">Current status: <StatusBadge status={user.college_verification_status} /></span>}</div></form>
  </section>;
}

function ProfileStats({ stats }) {
  return <section className="profile-section">
    <div className="panel-heading"><div><span className="section-eyebrow">ACCOUNT OVERVIEW</span><h2>Activity at a glance</h2></div></div>
    <div className="profile-stats-grid">{stats.map(({ label, value }) => <div className="metric-card profile-stat-card" key={label}><span>{label}</span><strong>{value ?? "—"}</strong><small>From your existing InternProof records</small></div>)}</div>
  </section>;
}

function StudentActivity({ current, currentUnavailable, applications, applicationsLoaded, internships }) {
  return <div className="row g-3">
    <div className="col-lg-7"><section className="panel-card h-100">
      <div className="panel-heading"><div><span className="section-eyebrow">CURRENT INTERNSHIP</span><h2>{current?.title || "No active internship"}</h2></div>{current && <StatusBadge status="accepted" />}</div>
      {current ? <><div className="profile-detail-list">
        <div><span>Company</span><strong>{current.company_name || "Not listed"}</strong></div>
        <div><span>Location</span><strong>{current.location || "Not listed"}</strong></div>
        <div><span>Progress</span><strong>{!current.tasksAvailable ? "Unavailable" : current.total ? Math.round(current.completed / current.total * 100) + "%" : "No tasks assigned"}</strong></div>
        <div><span>Tasks</span><strong>{current.tasksAvailable ? current.completed + " / " + current.total + " completed" : "Unavailable"}</strong></div>
        <div><span>Certificate</span><strong>{current.certificate === null ? "Unavailable" : current.certificate ? "Available" : "Not issued"}</strong></div>
      </div>{current.tasksAvailable && current.total > 0 && <div className="progress track-progress mt-3"><div className="progress-bar" style={{ width: Math.round(current.completed / current.total * 100) + "%" }} /></div>}</> : <p className="text-muted mb-0">{currentUnavailable ? "Current internship details are temporarily unavailable." : "An accepted internship will appear here when one is available."}</p>}
    </section></div>
    <div className="col-lg-5"><section className="panel-card h-100">
      <div className="panel-heading"><div><span className="section-eyebrow">RECENT APPLICATIONS</span><h2>Application activity</h2></div><Link to="/student/applications">View all</Link></div>
      {!applicationsLoaded ? <p className="text-muted mb-0">Application details are temporarily unavailable.</p> : applications.length ? applications.slice(0, 4).map((application) => {
        const item = internships.find((record) => record.id === application.internship_id);
        return <div className="activity-row" key={application.id}><span className="activity-copy"><b>{item?.title || ("Internship #" + application.internship_id)}</b><small>{item?.company_name || "Company details unavailable"}</small></span><StatusBadge status={application.status} /></div>;
      }) : <p className="text-muted mb-0">No applications yet.</p>}
    </section></div>
  </div>;
}

function CompanyActivity({ data }) {
  const applications = data?.applications || [];
  const internships = data?.internships || [];
  const acceptedIds = new Set(applications.filter((item) => item.status === "accepted").map((item) => item.student_id));
  const summaries = [["Active internships", internships.filter((item) => item.status === "active").length], ["Pending applications", applications.filter((item) => item.status === "pending").length], ["Accepted students", acceptedIds.size], ["Certificates issued", data?.certificates]];
  return <section className="panel-card">
    <div className="panel-heading"><div><span className="section-eyebrow">COMPANY ACTIVITY</span><h2>Team overview</h2></div><Link to="/company/internships">Manage internships</Link></div>
    <div className="profile-detail-grid">{summaries.map(([label, value], index) => <div className="profile-detail-tile" key={label}><span>{label}</span><strong>{index > 0 && !data?.applicationsLoaded ? "—" : value ?? "—"}</strong></div>)}</div>
    {!internships.length && <p className="text-muted mt-3 mb-0">No internships have been posted yet.</p>}
  </section>;
}

function CollegeActivity({ data }) {
  return <section className="panel-card">
    <div className="panel-heading"><div><span className="section-eyebrow">COLLEGE OVERVIEW</span><h2>College activity</h2></div><Link to="/college/reports">View reports</Link></div>
    <p className="text-muted">These totals include only students and internship records associated with your registered college.</p>
    <div className="profile-detail-grid">{(data?.stats || []).map(({ label, value }) => <div className="profile-detail-tile" key={label}><span>{label}</span><strong>{value ?? "Unavailable"}</strong></div>)}</div>
  </section>;
}
function SecurityCard() {
  return <section className="panel-card security-card">
    <div><span className="section-eyebrow">SECURITY</span><h2>Password</h2><p className="security-masked" aria-label="Password hidden">••••••••••••••</p><small>Your current password cannot be viewed. Passwords are stored as one-way hashes.</small></div>
    <Link to="/forgot-password" className="btn btn-outline-primary">Reset password</Link>
  </section>;
}

export default function ProfilePage({ role }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let session;
    try { session = JSON.parse(sessionStorage.getItem("user") || "null"); } catch { sessionStorage.removeItem("user"); }
    if (!session) { navigate("/login", { replace: true }); return; }
    if (session.role !== role) { navigate("/" + session.role + "/dashboard", { replace: true }); return; }
    setUser(session);
    const request = role === "student" ? loadStudent(session.user_id) : role === "company" ? loadCompany(session.user_id) : loadCollege();
    request.then(setProfile).catch((loadError) => {
      console.error("Profile data could not be loaded:", loadError);
      setError("Profile activity could not be loaded. Please try again later.");
    }).finally(() => setLoading(false));
  }, [navigate, role]);

  if (loading) return <div className="page-loading"><div className="spinner-border text-primary" role="status" /><span>Loading your profile…</span></div>;
  if (!user) return null;
  const title = roles[role] || "Account";
  return <div className="dashboard-page profile-page">
    <div className="page-heading-row"><div><span className="section-eyebrow">{title.toUpperCase()} ACCOUNT</span><h1 className="mt-2">Profile</h1><p className="text-muted mb-0">Manage your account information and profile details.</p></div></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {profile?.failed && <div className="alert alert-warning" role="status">Some activity details are temporarily unavailable. Any unavailable totals are shown as —.</div>}
    <div className="row g-3 profile-top-row"><div className="col-lg-4"><ProfileSummary user={user} role={role} /></div><div className="col-lg-8"><AccountInformation user={user} role={role} /></div></div>
    {role === "student" && <StudentCollegeAffiliation user={user} onUserChange={setUser} />}
    {profile && <><ProfileStats stats={profile.stats} />{role === "student" && <StudentActivity current={profile.current} currentUnavailable={profile.currentUnavailable} applications={profile.activity.applications} applicationsLoaded={profile.activity.applicationsLoaded} internships={profile.activity.internships} />}{role === "company" && <CompanyActivity data={profile.activity} />}{role === "college" && <CollegeActivity data={profile} />}<SecurityCard /></>}
  </div>;
}
