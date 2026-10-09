import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    college_id: "",
    roll_number: "",
    department: "",
    course: "",
    year: "",
    semester: "",
    college_code: "",
    company_code: "",
  });
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    let mounted = true;
    const loadColleges = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/colleges", { cache: "no-store" });
        const data = response.ok ? await response.json() : [];
        if (mounted) setColleges(data);
      } catch {
        if (mounted) setColleges([]);
      }
    };
    void loadColleges();
    window.addEventListener("focus", loadColleges);
    window.addEventListener("pageshow", loadColleges);
    return () => { mounted = false; window.removeEventListener("focus", loadColleges); window.removeEventListener("pageshow", loadColleges); };
  }, []);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...formData, college_id: formData.college_id ? Number(formData.college_id) : null }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Registration failed");
        return;
      }

      setMessage(data.message);

      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "student",
        college_id: "",
        roll_number: "",
        department: "",
        course: "",
        year: "",
        semester: "",
        college_code: "",
        company_code: "",
      });
    } catch {
      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="container"><div className="row justify-content-center align-items-stretch g-0">
        <div className="col-lg-5 d-none d-lg-block"><div className="auth-aside"><div><a className="auth-brand" href="/">InternProof</a><div className="mt-5"><span className="section-eyebrow" style={{color:'#C7C8FF'}}>START WITH A STRONG RECORD</span><h2 className="mt-3">Experience deserves to be seen.</h2><p>Join a connected internship community built around meaningful work and verifiable outcomes.</p></div></div><div className="small" style={{color:'#D1D5DB'}}>Students · Companies · Colleges</div></div></div>
        <div className="col-lg-7">

          <div className="card h-100"><div className="card-body p-4 p-lg-5"><h2 className="fw-bold mb-2">
            Create InternProof Account
          </h2>
          <p className="text-muted mb-4">Create your workspace to get started.</p>

          {message && (
            <div className="alert alert-success">
              {message}
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">

            <div className="mb-3">
              <label className="form-label" htmlFor="register-full-name">
                Full Name
              </label>

              <input
                id="register-full-name"
                type="text"
                name="full_name"
                className="form-control"
                placeholder="Enter your full name"
                autoComplete="name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            {formData.role === "student" && <>
              <div className="mb-3"><label className="form-label" htmlFor="register-college">Registered college</label><select id="register-college" name="college_id" className="form-select" value={formData.college_id} onChange={handleChange}><option value="">Select a college (optional)</option>{colleges.map((college) => <option key={college.id} value={college.id}>{college.full_name} · {college.college_code}</option>)}</select><small className="text-muted">Your college must approve your affiliation before you are marked verified.</small></div>
              <div className="row g-3 mb-3"><div className="col-md-6"><label className="form-label" htmlFor="register-roll-number">Roll number / Student ID</label><input id="register-roll-number" name="roll_number" className="form-control" placeholder="Enter your roll number" value={formData.roll_number} onChange={handleChange} required={Boolean(formData.college_id)} /></div><div className="col-md-6"><label className="form-label" htmlFor="register-department">Department</label><input id="register-department" name="department" className="form-control" placeholder="e.g. Computer Applications" value={formData.department} onChange={handleChange} required={Boolean(formData.college_id)} /></div><div className="col-md-6"><label className="form-label" htmlFor="register-course">Course / Program</label><input id="register-course" name="course" className="form-control" placeholder="e.g. BCA" value={formData.course} onChange={handleChange} required={Boolean(formData.college_id)} /></div><div className="col-md-6"><label className="form-label" htmlFor="register-year">Year</label><input id="register-year" name="year" className="form-control" placeholder="e.g. FY, SY, TY" value={formData.year} onChange={handleChange} required={Boolean(formData.college_id)} /></div><div className="col-md-6"><label className="form-label" htmlFor="register-semester">Semester</label><input id="register-semester" name="semester" className="form-control" placeholder="e.g. III" value={formData.semester} onChange={handleChange} required={Boolean(formData.college_id)} /></div></div>
            </>}
            {formData.role === "college" && <div className="mb-3"><label className="form-label" htmlFor="register-college-code">College code</label><input id="register-college-code" name="college_code" className="form-control" placeholder="Enter your registered college code" value={formData.college_code} onChange={handleChange} autoCapitalize="characters" required /></div>}
            {formData.role === "company" && <div className="mb-3"><label className="form-label" htmlFor="register-company-code">Company code</label><input id="register-company-code" name="company_code" className="form-control" placeholder="Enter your company code" value={formData.company_code || ""} onChange={handleChange} autoCapitalize="characters" required /></div>}

            <div className="mb-3">
              <label className="form-label" htmlFor="register-email">
                Email
              </label>

              <input
                id="register-email"
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter your email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="register-password">
                Password
              </label>

              <input
                id="register-password"
                type="password"
                name="password"
                className="form-control"
                placeholder="Create a password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Register As
              </label>

              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">
                  Student
                </option>

                <option value="company">
                  Company / Mentor
                </option>

                <option value="college">
                  College
                </option>
              </select>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
              <Link to="/" className="btn btn-outline-primary">
                Back to Home
              </Link>
            </div>

          </form></div></div>

        </div>
      </div></div>
    </div>
  );
}

export default Register;
