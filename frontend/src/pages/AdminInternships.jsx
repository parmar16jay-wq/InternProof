import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminInternships() {
  const navigate = useNavigate();

  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // CHECK ADMIN LOGIN
  // =====================================================

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (user.role !== "admin") {
        navigate("/login");
        return;
      }

      loadInternships();
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // =====================================================
  // LOAD INTERNSHIPS
  // =====================================================

  const loadInternships = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load internships."
        );
      }

      // Load application count for every internship
      const internshipsWithApplications =
        await Promise.all(
          data.map(async (internship) => {
            try {
              const applicationResponse =
                await fetch(
                  `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
                );

              if (!applicationResponse.ok) {
                return {
                  ...internship,
                  applicationCount: 0,
                };
              }

              const applications =
                await applicationResponse.json();

              return {
                ...internship,
                applicationCount:
                  Array.isArray(applications)
                    ? applications.length
                    : 0,
              };
            } catch (error) {
              console.error(
                "Error loading applications:",
                error
              );

              return {
                ...internship,
                applicationCount: 0,
              };
            }
          })
        );

      setInternships(
        internshipsWithApplications
      );
    } catch (error) {
      console.error(
        "Error loading internships:",
        error
      );

      setError(
        error.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DELETE INTERNSHIP
  // =====================================================

  const handleDelete = async (internship) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${internship.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/internships/${internship.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(
                data.detail || data
              );

        throw new Error(
          errorMessage ||
            "Unable to delete internship."
        );
      }

      // Remove deleted internship from screen
      setInternships((current) =>
        current.filter(
          (item) =>
            item.id !== internship.id
        )
      );

      alert(
        "Internship deleted successfully."
      );
    } catch (error) {
      console.error(
        "Error deleting internship:",
        error
      );

      alert(
        error.message ||
          "Unable to delete internship."
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not specified";
    }

    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadge = (status) => {
    const currentStatus =
      status || "active";

    if (
      currentStatus.toLowerCase() ===
      "active"
    ) {
      return (
        <span className="badge bg-success">
          Active
        </span>
      );
    }

    if (
      currentStatus.toLowerCase() ===
      "closed"
    ) {
      return (
        <span className="badge bg-danger">
          Closed
        </span>
      );
    }

    if (
      currentStatus.toLowerCase() ===
      "completed"
    ) {
      return (
        <span className="badge bg-secondary">
          Completed
        </span>
      );
    }

    return (
      <span className="badge bg-warning text-dark">
        {currentStatus}
      </span>
    );
  };

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalInternships =
    internships.length;

  const activeInternships =
    internships.filter(
      (internship) =>
        (internship.status || "active")
          .toLowerCase() === "active"
    ).length;

  const totalApplications =
    internships.reduce(
      (total, internship) =>
        total +
        (internship.applicationCount || 0),
      0
    );

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="container py-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Manage Internships
          </h1>

          <p className="text-muted mb-0">
            View and manage all internships
            available on the InternProof platform.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() =>
            navigate("/admin/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

      </div>


      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="row g-4 mb-4">

        {/* Total */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold">
                {totalInternships}
              </h2>

            </div>

          </div>

        </div>


        {/* Active */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Active Internships
              </h6>

              <h2 className="fw-bold text-success">
                {activeInternships}
              </h2>

            </div>

          </div>

        </div>


        {/* Applications */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Applications
              </h6>

              <h2 className="fw-bold text-primary">
                {totalApplications}
              </h2>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}


      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (

        <div className="text-center py-5">

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

      ) : (

        /* =================================================
           INTERNSHIP LIST
        ================================================= */

        <div>

          {internships.length === 0 ? (

            <div className="card shadow-sm border-0">

              <div className="card-body text-center py-5">

                <h4 className="fw-bold">
                  No Internships Found
                </h4>

                <p className="text-muted mb-0">
                  There are currently no
                  internships on the platform.
                </p>

              </div>

            </div>

          ) : (

            internships.map((internship) => (

              <div
                className="card shadow-sm border-0 mb-4"
                key={internship.id}
              >

                <div className="card-body">

                  {/* =================================================
                      TITLE + STATUS
                  ================================================= */}

                  <div className="d-flex justify-content-between align-items-start mb-3">

                    <div>

                      <h4 className="fw-bold mb-1">
                        {internship.title}
                      </h4>

                      <p className="text-muted mb-0">
                        Internship ID: #
                        {internship.id}
                      </p>

                    </div>

                    <div>
                      {getStatusBadge(
                        internship.status
                      )}
                    </div>

                  </div>


                  {/* =================================================
                      DETAILS
                  ================================================= */}

                  <div className="row g-3">

                    <div className="col-md-6">

                      <strong>
                        Company
                      </strong>

                      <p className="text-muted mb-0">
                        {internship.company_name ||
                          "Not specified"}
                      </p>

                    </div>


                    <div className="col-md-6">

                      <strong>
                        Location
                      </strong>

                      <p className="text-muted mb-0">
                        {internship.location ||
                          "Not specified"}
                      </p>

                    </div>


                    <div className="col-md-6">

                      <strong>
                        Start Date
                      </strong>

                      <p className="text-muted mb-0">
                        {formatDate(
                          internship.start_date
                        )}
                      </p>

                    </div>


                    <div className="col-md-6">

                      <strong>
                        End Date
                      </strong>

                      <p className="text-muted mb-0">
                        {formatDate(
                          internship.end_date
                        )}
                      </p>

                    </div>


                    <div className="col-md-6">

                      <strong>
                        Created By
                      </strong>

                      <p className="text-muted mb-0">
                        User ID #
                        {internship.created_by}
                      </p>

                    </div>


                    <div className="col-md-6">

                      <strong>
                        Applications
                      </strong>

                      <p className="text-muted mb-0">
                        {internship.applicationCount ||
                          0}{" "}
                        application
                        {(
                          internship.applicationCount ||
                          0
                        ) !== 1
                          ? "s"
                          : ""}
                      </p>

                    </div>

                  </div>


                  {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                  <div className="mt-3">

                    <strong>
                      Description
                    </strong>

                    <p className="text-muted mb-0">
                      {internship.description ||
                        "No description available."}
                    </p>

                  </div>


                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <div className="mt-4">

                    <button
                      className="btn btn-outline-danger"
                      onClick={() =>
                        handleDelete(
                          internship
                        )
                      }
                    >
                      Delete Internship
                    </button>

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      )}


      {/* =================================================
          INFORMATION
      ================================================= */}

      <div className="card shadow-sm border-0 mt-4">

        <div className="card-body">

          <h5 className="fw-bold mb-2">
            Internship Management
          </h5>

          <p className="text-muted mb-0">
            Administrators can monitor internships
            created by companies, review application
            activity and remove internships from the
            InternProof platform when required.
          </p>

        </div>

      </div>

    </div>
  );
}

export default AdminInternships;
