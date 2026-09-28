import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    // ------------------------------------------------
    // Remove any old login session
    // ------------------------------------------------

    sessionStorage.removeItem("user");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      console.log("Login response:", data);

      // ----------------------------------------
      // Backend returned an error
      // ----------------------------------------

      if (!response.ok) {
        setError(
          data.detail || "Invalid email or password."
        );

        return;
      }

      // ----------------------------------------
      // Check that backend returned user ID
      // ----------------------------------------

      if (!data.user_id) {
        setError(
          "Login successful, but user information was not returned."
        );

        return;
      }

      // ----------------------------------------
      // Save ONLY the newly logged-in user
      // ----------------------------------------

      sessionStorage.setItem(
        "user",
        JSON.stringify(data)
      );

      console.log(
        "New logged-in user:",
        data
      );

      console.log(
        "New user ID:",
        data.user_id
      );

      // ----------------------------------------
      // Redirect according to user role
      // ----------------------------------------

      if (data.role === "student") {
        navigate("/student/dashboard");
      }

      else if (data.role === "company") {
        navigate("/company/dashboard");
      }

      else if (data.role === "college") {
        navigate("/college/dashboard");
      }

      else if (data.role === "admin") {
        navigate("/admin/dashboard");
      }

      else {
        // Remove invalid session
        sessionStorage.removeItem("user");

        setError(
          "Login successful, but user role was not found."
        );
      }

    } catch (error) {
      console.error("Login error:", error);

      // Remove session if login failed
      sessionStorage.removeItem("user");

      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    }

    finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">

      <div className="container"><div className="row justify-content-center align-items-stretch g-0">

        <div className="col-lg-5 d-none d-lg-block"><div className="auth-aside"><div><Link className="auth-brand" to="/">InternProof</Link><div className="mt-5"><span className="section-eyebrow" style={{color:'#C7C8FF'}}>YOUR EXPERIENCE, VERIFIED</span><h2 className="mt-3">Make every milestone count.</h2><p>One connected place to manage internship applications, progress, communication, and proof of achievement.</p></div></div><div className="small" style={{color:'#D1D5DB'}}>Verifiable Internship and OJT Evidence Platform</div></div></div>

        <div className="col-lg-7">

          <div className="card shadow-sm h-100">

            <div className="card-body p-4">

              {/* Heading */}

              <h2 className="fw-bold mb-3">
                Login
              </h2>

              <p className="text-muted mb-4">
                Login to your InternProof account.
              </p>


              {/* Error */}

              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}


              {/* Login Form */}

              <form
                onSubmit={handleSubmit}
                autoComplete="off"
              >

                {/* Email */}

                <div className="mb-3">

                  <label className="form-label">
                    Email Address
                  </label>

                  <input
                    type="email"
                    name="internproof-email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                  />

                </div>


                {/* Password */}

                <div className="mb-3">

                  <label className="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    name="internproof-password"
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />

                </div>


                {/* Forgot Password */}

                <div className="text-end mb-4">

                  <Link to="/forgot-password">
                    Forgot Password?
                  </Link>

                </div>


                {/* Login Button */}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading
                    ? "Logging in..."
                    : "Login"}
                </button>

              </form>


              {/* Register */}

              <div className="text-center mt-4">

                <span className="text-muted">
                  Don't have an account?{" "}
                </span>

                <Link to="/register">
                  Register
                </Link>

              </div>


              {/* Back Home */}

              <div className="text-center mt-3">

                <Link to="/">
                  Back to Home
                </Link>

              </div>

            </div>

          </div>

        </div>

      </div></div>

    </div>
  );
}

export default Login;
