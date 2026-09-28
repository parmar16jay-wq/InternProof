import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CollegeInternships() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);

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
      loadInternships();
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadInternships = async () => {
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

          allApplications = [
            ...allApplications,
            ...applicationData,
          ];
        } catch (error) {
          console.error(
            "Unable to load internship applications:",
            error
          );
        }
      }

      setApplications(allApplications);

    } catch (error) {
      console.error(
        "Error loading internships:",
        error
      );

      setError(
        error.message ||
          "Unable to load internships."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Get application count
  // ----------------------------------------

  const getApplicationCount = (internshipId) => {
    return applications.filter(
      (application) =>
        Number(application.internship_id) ===
        Number(internshipId)
    ).length;
  };

  // ----------------------------------------
  // Get accepted application count
  // ----------------------------------------

  const getAcceptedCount = (internshipId) => {
    return applications.filter(
      (application) =>
        Number(application.internship_id) ===
          Number(internshipId) &&
        application.status === "accepted"
    ).length;
  };

  // ----------------------------------------
  // Get pending application count
  // ----------------------------------------

  const getPendingCount = (internshipId) => {
    return applications.filter(
      (application) =>
        Number(application.internship_id) ===
          Number(internshipId) &&
        application.status === "pending"
    ).length;
  };

  // ----------------------------------------
  // Get status badge
  // ----------------------------------------

  const getStatusBadge = (status) => {
    if (status === "active") {
      return (
        <span className="badge bg-success">
          Active
        </span>
      );
    }

    if (status === "completed") {
      return (
        <span className="badge bg-primary">
          Completed
        </span>
      );
    }

    if (status === "inactive") {
      return (
        <span className="badge bg-secondary">
          Inactive
        </span>
      );
    }

    return (
      <span className="badge bg-warning text-dark">
        {status || "Unknown"}
      </span>
    );
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
            Loading internships...
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
            Internships
          </h1>

          <p className="text-muted mb-0">
            Monitor internships posted by companies.
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

        {/* Total Internships */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-primary text-white rounded p-3 me-3"
                  style={{ fontSize: "24px" }}
                >
                  💼
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Total Internships
                  </p>

                  <h2 className="fw-bold text-primary mb-0">
                    {internships.length}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Active Internships */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-success text-white rounded p-3 me-3"
                  style={{ fontSize: "24px" }}
                >
                  ✅
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Active Internships
                  </p>

                  <h2 className="fw-bold text-success mb-0">
                    {
                      internships.filter(
                        (internship) =>
                          internship.status ===
                          "active"
                      ).length
                    }
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Total Applications */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-info text-white rounded p-3 me-3"
                  style={{ fontSize: "24px" }}
                >
                  📝
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Total Applications
                  </p>

                  <h2 className="fw-bold text-info mb-0">
                    {applications.length}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* Internship List */}

      {internships.length === 0 ? (

        <div className="card shadow-sm border-0">

          <div className="card-body text-center py-5">

            <div
              style={{ fontSize: "50px" }}
              className="mb-3"
            >
              💼
            </div>

            <h4 className="fw-bold">
              No Internships Found
            </h4>

            <p className="text-muted mb-0">
              There are currently no internships
              available in the system.
            </p>

          </div>

        </div>

      ) : (

        <div className="row g-4">

          {internships.map((internship) => (

            <div
              className="col-md-6"
              key={internship.id}
            >

              <div className="card shadow-sm border-0 h-100">

                <div className="card-body">

                  {/* Internship Header */}

                  <div className="d-flex justify-content-between align-items-start mb-3">

                    <div>

                      <h4 className="fw-bold mb-2">
                        {internship.title}
                      </h4>

                      <p className="text-muted mb-0">
                        {internship.company_name}
                      </p>

                    </div>

                    <div>
                      {getStatusBadge(
                        internship.status
                      )}
                    </div>

                  </div>


                  {/* Description */}

                  <div className="mb-4">

                    <p className="mb-0">
                      {internship.description}
                    </p>

                  </div>


                  {/* Internship Details */}

                  <div className="border-top pt-3">

                    <p className="mb-2">

                      <strong>
                        Company:
                      </strong>{" "}

                      {internship.company_name}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Location:
                      </strong>{" "}

                      {internship.location ||
                        "Not specified"}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Start Date:
                      </strong>{" "}

                      {internship.start_date ||
                        "Not specified"}

                    </p>

                    <p className="mb-3">

                      <strong>
                        End Date:
                      </strong>{" "}

                      {internship.end_date ||
                        "Not specified"}

                    </p>

                  </div>


                  {/* Application Statistics */}

                  <div className="row g-2 border-top pt-3">

                    <div className="col-4">

                      <div className="bg-light rounded p-2 text-center">

                        <div className="fw-bold text-primary">
                          {getApplicationCount(
                            internship.id
                          )}
                        </div>

                        <small className="text-muted">
                          Applications
                        </small>

                      </div>

                    </div>


                    <div className="col-4">

                      <div className="bg-light rounded p-2 text-center">

                        <div className="fw-bold text-success">
                          {getAcceptedCount(
                            internship.id
                          )}
                        </div>

                        <small className="text-muted">
                          Accepted
                        </small>

                      </div>

                    </div>


                    <div className="col-4">

                      <div className="bg-light rounded p-2 text-center">

                        <div className="fw-bold text-warning">
                          {getPendingCount(
                            internship.id
                          )}
                        </div>

                        <small className="text-muted">
                          Pending
                        </small>

                      </div>

                    </div>

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

export default CollegeInternships;