import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyInternships() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      if (userData.role !== "company") {
        navigate("/login");
        return;
      }

      setUser(userData);

      loadInternships(userData.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadInternships = async (companyId) => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!response.ok) {
        throw new Error("Unable to load internships.");
      }

      const data = await response.json();

      const companyInternships = data.filter(
        (internship) =>
          internship.created_by === companyId
      );

      setInternships(companyInternships);
    } catch (error) {
      console.error(
        "Unable to load company internships:",
        error
      );

      alert(
        "Unable to load internships. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (internshipId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this internship?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/internships/${internshipId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user?.token || ""}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to delete internship."
        );
      }

      alert("Internship deleted successfully.");

      if (user) {
        loadInternships(user.user_id);
      }
    } catch (error) {
      console.error(
        "Delete internship error:",
        error
      );

      alert(
        error.message ||
          "Something went wrong while deleting the internship."
      );
    }
  };

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
            Loading your internships...
          </p>
        </div>
      </div>
    );
  }

  const activeInternships = internships.filter(
    (internship) =>
      internship.status === "active"
  ).length;

  const otherInternships =
    internships.length - activeInternships;

  return (
    <div className="container py-5">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            My Internships
          </h1>

          <p className="text-muted mb-0">
            View and manage the internships posted by your company.
          </p>
        </div>

        <Link
          to="/company/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary */}
      <div className="row g-4 mb-4">

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold mb-0">
                {internships.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Active Internships
              </h6>

              <h2 className="fw-bold text-success mb-0">
                {activeInternships}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Other Internships
              </h6>

              <h2 className="fw-bold mb-0">
                {otherInternships}
              </h2>
            </div>
          </div>
        </div>

      </div>

      {/* Internship List */}
      {internships.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">

            <h4 className="fw-bold mb-2">
              No Internships Yet
            </h4>

            <p className="text-muted mb-0">
              You have not posted any internships yet.
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
              <div className="card shadow-sm h-100">

                <div className="card-body">

                  <div className="d-flex justify-content-between align-items-start mb-3">

                    <h4 className="fw-bold mb-0">
                      {internship.title}
                    </h4>

                    <span
                      className={`badge ${
                        internship.status === "active"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {internship.status}
                    </span>

                  </div>

                  <p className="text-muted">
                    {internship.description}
                  </p>

                  <hr />

                  <p className="mb-2">
                    <strong>Company:</strong>{" "}
                    {internship.company_name}
                  </p>

                  <p className="mb-2">
                    <strong>Location:</strong>{" "}
                    {internship.location ||
                      "Not specified"}
                  </p>

                  <p className="mb-2">
                    <strong>Start Date:</strong>{" "}
                    {internship.start_date ||
                      "Not specified"}
                  </p>

                  <p className="mb-3">
                    <strong>End Date:</strong>{" "}
                    {internship.end_date ||
                      "Not specified"}
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() =>
                      handleDelete(internship.id)
                    }
                  >
                    Delete Internship
                  </button>

                </div>

              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}

export default CompanyInternships;
