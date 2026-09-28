import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function MyApplications() {
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [internships, setInternships] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------
  // Get logged-in student
  // ----------------------------------------

  useEffect(() => {
    const savedUser = sessionStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const userData = JSON.parse(savedUser);

      setUser(userData);

      loadApplications(userData.user_id);
    } catch (error) {
      console.error("User data error:", error);

      sessionStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  // ----------------------------------------
  // Load applications and internships
  // ----------------------------------------

  const loadApplications = async (studentId) => {
    try {
      setLoading(true);
      setError("");

      // Get student's applications
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/student/${studentId}`
      );

      const applicationData =
        await applicationResponse.json();

      if (!applicationResponse.ok) {
        throw new Error(
          applicationData.detail ||
            "Unable to load applications."
        );
      }

      setApplications(applicationData);

      // Get all internships
      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      const internshipData =
        await internshipResponse.json();

      if (internshipResponse.ok) {
        setInternships(internshipData);
      }

    } catch (error) {
      console.error(
        "Application loading error:",
        error
      );

      setError(
        "Unable to load your applications. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Find internship details
  // ----------------------------------------

  const getInternship = (internshipId) => {
    return internships.find(
      (internship) =>
        internship.id === internshipId
    );
  };

  // ----------------------------------------
  // Status badge
  // ----------------------------------------

  const getStatusBadge = (status) => {
    if (status === "accepted") {
      return (
        <span className="badge bg-success">
          Accepted
        </span>
      );
    }

    if (status === "rejected") {
      return (
        <span className="badge bg-danger">
          Rejected
        </span>
      );
    }

    return (
      <span className="badge bg-warning text-dark">
        Pending
      </span>
    );
  };

  // ----------------------------------------
  // Logout
  // ----------------------------------------

  const handleLogout = () => {
    sessionStorage.removeItem("user");

    window.location.href = "/login";
  };

  // ----------------------------------------
  // Loading screen
  // ----------------------------------------

  if (loading) {
    return (
      <div className="container py-5">

        <div className="text-center">

          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <p className="text-muted mt-3">
            Loading your applications...
          </p>

        </div>

      </div>
    );
  }

  // ----------------------------------------
  // Page
  // ----------------------------------------

  return (
    <div className="container py-4">

      {/* ====================================
          HEADER
      ==================================== */}

      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>

          <h1 className="fw-bold mb-2">
            My Applications
          </h1>

          <p className="text-muted mb-0">
            Track your internship applications
            and their status.
          </p>

          {user && (
            <p className="mt-2 mb-0">
              Student:{" "}
              <strong>{user.full_name}</strong>
            </p>
          )}

        </div>

        <button
          className="btn btn-outline-danger"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

      {/* ====================================
          BACK TO DASHBOARD
      ==================================== */}

      <div className="mb-4">

        <Link
          to="/student/dashboard"
          className="btn btn-secondary"
        >
          ← Back to Dashboard
        </Link>

      </div>

      {/* ====================================
          ERROR
      ==================================== */}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* ====================================
          NO APPLICATIONS
      ==================================== */}

      {!error && applications.length === 0 && (

        <div className="card shadow-sm">

          <div className="card-body text-center p-5">

            <div
              style={{
                fontSize: "50px",
              }}
            >
              📄
            </div>

            <h4 className="fw-bold mt-3">
              No Applications Yet
            </h4>

            <p className="text-muted">
              You have not applied for any
              internships yet.
            </p>

            <Link
              to="/student/internships"
              className="btn btn-primary"
            >
              Browse Internships
            </Link>

          </div>

        </div>

      )}

      {/* ====================================
          APPLICATIONS
      ==================================== */}

      {applications.length > 0 && (

        <div className="row g-4">

          {applications.map((application) => {

            const internship =
              getInternship(
                application.internship_id
              );

            return (
              <div
                className="col-md-6 col-lg-4"
                key={application.id}
              >

                <div
                  className="card h-100 shadow-sm"
                  style={{
                    borderRadius: "12px",
                  }}
                >

                  <div className="card-body p-4">

                    {/* Icon */}

                    <div
                      className="d-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "10px",
                        backgroundColor: "#f3e5f5",
                        fontSize: "30px",
                      }}
                    >
                      📄
                    </div>

                    {/* Internship title */}

                    <h4 className="fw-bold">

                      {internship
                        ? internship.title
                        : `Internship #${application.internship_id}`}

                    </h4>

                    {/* Company */}

                    {internship && (
                      <p className="mb-2">

                        <strong>
                          Company:
                        </strong>{" "}

                        {internship.company_name}

                      </p>
                    )}

                    {/* Location */}

                    {internship &&
                      internship.location && (
                        <p className="mb-2">

                          <strong>
                            Location:
                          </strong>{" "}

                          {internship.location}

                        </p>
                      )}

                    {/* Applied date */}

                    <p className="mb-3">

                      <strong>
                        Applied On:
                      </strong>{" "}

                      {application.applied_at
                        ? new Date(
                            application.applied_at
                          ).toLocaleDateString()
                        : "Not available"}

                    </p>

                    {/* Status */}

                    <div className="mb-3">

                      <strong>
                        Status:
                      </strong>{" "}

                      {getStatusBadge(
                        application.status
                      )}

                    </div>

                    {/* Application ID */}

                    <p className="text-muted small mb-0">

                      Application ID:{" "}
                      {application.id}

                    </p>

                  </div>

                </div>

              </div>
            );
          })}

        </div>

      )}

    </div>
  );
}

export default MyApplications;