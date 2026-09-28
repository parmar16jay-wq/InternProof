import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CollegeApplications() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [internships, setInternships] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      if (userData.role !== "college") {
        navigate("/login");
        return;
      }

      setUser(userData);
      loadApplications();
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      // ----------------------------------------
      // Load all internships
      // ----------------------------------------

      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      const internshipData =
        await internshipResponse.json();

      if (!internshipResponse.ok) {
        throw new Error(
          typeof internshipData.detail === "string"
            ? internshipData.detail
            : "Unable to load internships."
        );
      }

      setInternships(internshipData);

      // ----------------------------------------
      // Load applications for every internship
      // ----------------------------------------

      let allApplications = [];

      for (const internship of internshipData) {
        try {
          const applicationResponse = await fetch(
            `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
          );

          if (!applicationResponse.ok) {
            continue;
          }

          const applicationData =
            await applicationResponse.json();

          const applicationsWithInternship =
            applicationData.map((application) => ({
              ...application,

              internship_title:
                internship.title,

              company_name:
                internship.company_name,

              location:
                internship.location,

              start_date:
                internship.start_date,

              end_date:
                internship.end_date
            }));

          allApplications = [
            ...allApplications,
            ...applicationsWithInternship
          ];
        } catch (error) {
          console.error(
            "Unable to load applications:",
            error
          );
        }
      }

      setApplications(allApplications);

    } catch (error) {
      console.error(
        "Error loading applications:",
        error
      );

      setError(
        error.message ||
          "Unable to load applications."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Application counts
  // ----------------------------------------

  const pendingCount = applications.filter(
    (application) =>
      application.status === "pending"
  ).length;

  const acceptedCount = applications.filter(
    (application) =>
      application.status === "accepted"
  ).length;

  const rejectedCount = applications.filter(
    (application) =>
      application.status === "rejected"
  ).length;

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
  // Format application date
  // ----------------------------------------

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-IN");
  };

  // ----------------------------------------
  // Loading
  // ----------------------------------------

  if (!user || loading) {
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
            Loading applications...
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

      {/* Header */}

      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>

          <h1 className="fw-bold mb-2">
            Applications
          </h1>

          <p className="text-muted mb-0">
            Monitor student internship applications.
          </p>

        </div>

        <Link
          to="/college/dashboard"
          className="btn btn-primary"
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


      {/* Summary Cards */}

      <div className="row g-4 mb-4">

        {/* Total */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-primary text-white rounded p-3 me-3"
                  style={{ fontSize: "22px" }}
                >
                  📝
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Total
                  </p>

                  <h2 className="fw-bold text-primary mb-0">
                    {applications.length}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Pending */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-warning text-white rounded p-3 me-3"
                  style={{ fontSize: "22px" }}
                >
                  ⏳
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Pending
                  </p>

                  <h2 className="fw-bold text-warning mb-0">
                    {pendingCount}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Accepted */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-success text-white rounded p-3 me-3"
                  style={{ fontSize: "22px" }}
                >
                  ✅
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Accepted
                  </p>

                  <h2 className="fw-bold text-success mb-0">
                    {acceptedCount}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Rejected */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-danger text-white rounded p-3 me-3"
                  style={{ fontSize: "22px" }}
                >
                  ❌
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Rejected
                  </p>

                  <h2 className="fw-bold text-danger mb-0">
                    {rejectedCount}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* Applications List */}

      {applications.length === 0 ? (

        <div className="card shadow-sm border-0">

          <div className="card-body text-center py-5">

            <div
              style={{ fontSize: "50px" }}
              className="mb-3"
            >
              📝
            </div>

            <h4 className="fw-bold">
              No Applications Yet
            </h4>

            <p className="text-muted mb-0">
              No students have submitted internship
              applications yet.
            </p>

          </div>

        </div>

      ) : (

        <div className="row g-4">

          {applications.map((application) => (

            <div
              className="col-md-6"
              key={application.id}
            >

              <div className="card shadow-sm border-0 h-100">

                <div className="card-body">

                  {/* Header */}

                  <div className="d-flex justify-content-between align-items-start mb-3">

                    <div>

                      <h4 className="fw-bold mb-1">
                        {application.internship_title}
                      </h4>

                      <p className="text-muted mb-0">
                        {application.company_name}
                      </p>

                    </div>

                    <div>
                      {getStatusBadge(
                        application.status
                      )}
                    </div>

                  </div>


                  {/* Student Information */}

                  <div className="border-top pt-3">

                    <p className="mb-2">

                      <strong>
                        Student ID:
                      </strong>{" "}

                      {application.student_id}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Application ID:
                      </strong>{" "}

                      {application.id}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Company:
                      </strong>{" "}

                      {application.company_name}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Location:
                      </strong>{" "}

                      {application.location ||
                        "Not specified"}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Applied Date:
                      </strong>{" "}

                      {formatDate(
                        application.applied_at
                      )}

                    </p>

                  </div>


                  {/* Internship Dates */}

                  <div className="border-top pt-3 mt-3">

                    <p className="mb-2">

                      <strong>
                        Internship Start:
                      </strong>{" "}

                      {application.start_date ||
                        "Not specified"}

                    </p>

                    <p className="mb-0">

                      <strong>
                        Internship End:
                      </strong>{" "}

                      {application.end_date ||
                        "Not specified"}

                    </p>

                  </div>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

export default CollegeApplications;