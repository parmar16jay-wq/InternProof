import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function MyInternship() {
  const [user, setUser] = useState(null);
  const [internship, setInternship] = useState(null);
  const [application, setApplication] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = sessionStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const loggedInUser = JSON.parse(savedUser);

      setUser(loggedInUser);

      loadInternship(loggedInUser.user_id);
    } catch (error) {
      console.error("User data error:", error);

      sessionStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  const loadInternship = async (studentId) => {
    try {
      setLoading(true);
      setError("");

      // Get student's applications
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/student/${studentId}`
      );

      if (!applicationResponse.ok) {
        throw new Error("Unable to load applications.");
      }

      const applicationData =
        await applicationResponse.json();

      // Find accepted internship first
      let selectedApplication =
        applicationData.find(
          (item) => item.status === "accepted"
        );

      // If no accepted internship exists,
      // show the latest application
      if (!selectedApplication && applicationData.length > 0) {
        selectedApplication =
          applicationData[applicationData.length - 1];
      }

      if (!selectedApplication) {
        setApplication(null);
        setInternship(null);
        return;
      }

      setApplication(selectedApplication);

      // Get all internships
      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData =
        await internshipResponse.json();

      // Find internship connected with application
      const selectedInternship =
        internshipData.find(
          (item) =>
            item.id === selectedApplication.internship_id
        );

      setInternship(selectedInternship || null);
    } catch (error) {
      console.error(
        "My Internship loading error:",
        error
      );

      setError(
        "Unable to load your internship. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

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

  if (!user || loading) {
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border text-primary"
          role="status"
        >
          <span className="visually-hidden">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            My Internship
          </h1>

          <p className="text-muted mb-1">
            View your internship details
          </p>

          <p className="mb-0">
            Hello, <strong>{user.full_name}</strong>
          </p>
        </div>

        {/* Back to Dashboard */}
        <Link
          to="/student/dashboard"
          className="btn btn-outline-primary"
        >
          ← Back to Dashboard
        </Link>

      </div>

      {/* Error */}
      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* No internship */}
      {!error && !internship && (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">

            <div
              className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: "80px",
                height: "80px",
                fontSize: "35px",
              }}
            >
              🎓
            </div>

            <h3 className="fw-bold">
              No Internship Yet
            </h3>

            <p className="text-muted">
              You have not applied for an internship yet.
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

      {/* Internship Details */}
      {!error && internship && application && (
        <div className="card shadow-sm border-0">

          <div className="card-body p-4">

            <div className="d-flex justify-content-between align-items-start mb-4">

              <div>
                <h2 className="fw-bold mb-2">
                  {internship.title}
                </h2>

                <h5 className="text-primary mb-0">
                  {internship.company_name}
                </h5>
              </div>

              <div>
                {getStatusBadge(application.status)}
              </div>

            </div>

            <hr />

            {/* Internship Information */}
            <div className="row g-4 mt-2">

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    Company
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    {internship.company_name}
                  </h6>
                </div>
              </div>

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    Location
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    {internship.location || "Not specified"}
                  </h6>
                </div>
              </div>

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    Start Date
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    {internship.start_date || "Not specified"}
                  </h6>
                </div>
              </div>

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    End Date
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    {internship.end_date || "Not specified"}
                  </h6>
                </div>
              </div>

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    Application ID
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    #{application.id}
                  </h6>
                </div>
              </div>

              <div className="col-md-6">
                <div className="bg-light rounded p-3">
                  <small className="text-muted">
                    Applied Date
                  </small>

                  <h6 className="fw-bold mb-0 mt-1">
                    {application.applied_at
                      ? new Date(
                          application.applied_at
                        ).toLocaleDateString()
                      : "Not available"}
                  </h6>
                </div>
              </div>

            </div>

            {/* Description */}
            <div className="mt-4">

              <h5 className="fw-bold">
                Internship Description
              </h5>

              <p className="text-muted mb-0">
                {internship.description}
              </p>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MyInternship;