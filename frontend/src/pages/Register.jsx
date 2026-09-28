import { useState } from "react";
import { Link } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
  });

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
          body: JSON.stringify(formData),
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
      });
    } catch (error) {
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
