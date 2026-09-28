import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    // Check token
    if (!token) {
      setError(
        "Invalid password reset link. The reset token is missing."
      );
      return;
    }

    // Check passwords
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Check password length
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      console.log("Reset token:", token);

      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/reset-password",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            token: token,
            new_password: newPassword,
          }),
        }
      );

      // Read response safely
      const data = await response.json();

      console.log("Backend response:", data);
      console.log("Response status:", response.status);

      if (!response.ok) {
        setError(
          data.detail ||
            `Password reset failed. Server returned status ${response.status}.`
        );

        return;
      }

      setMessage(
        "Password reset successfully! Redirecting to login..."
      );

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Reset password error:", error);

      setError(
        "Unable to connect to the server. Please make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">

          <div className="card shadow-sm">
            <div className="card-body p-4">

              <h2 className="fw-bold mb-3">
                Reset Password
              </h2>

              <p className="text-muted mb-4">
                Enter your new password below.
              </p>

              {/* Success Message */}
              {message && (
                <div className="alert alert-success">
                  {message}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* New Password */}
                <div className="mb-3">
                  <label className="form-label">
                    New Password
                  </label>

                  <div className="password-field">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                    <button className="password-visibility-toggle" type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? "Hide new password" : "Show new password"} title={showNewPassword ? "Hide password" : "Show password"}>
                      <PasswordEye visible={showNewPassword} />
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label className="form-label">
                    Confirm New Password
                  </label>

                  <div className="password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                    <button className="password-visibility-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} title={showConfirmPassword ? "Hide password" : "Show password"}>
                      <PasswordEye visible={showConfirmPassword} />
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading
                    ? "Resetting Password..."
                    : "Reset Password"}
                </button>

              </form>

              <div className="text-center mt-4">
                <Link to="/login">
                  Back to Login
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PasswordEye({ visible }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {!visible && <path d="m4 4 16 16" />}
  </svg>;
}

export default ResetPassword;
