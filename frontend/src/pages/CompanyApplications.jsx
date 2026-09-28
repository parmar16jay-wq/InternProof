import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyApplications() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

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
      loadApplications(userData.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadApplications = async (companyId) => {
    try {
      setLoading(true);

      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData = await internshipResponse.json();

      const companyInternships = internshipData.filter(
        (internship) =>
          internship.created_by === companyId
      );

      setInternships(companyInternships);

      let allApplications = [];

      for (const internship of companyInternships) {
        try {
          const applicationResponse = await fetch(
            `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
          );

          if (applicationResponse.ok) {
            const applicationData =
              await applicationResponse.json();

            const applicationsWithInternship =
              applicationData.map(
                (application) => ({
                  ...application,
                  internship_title:
                    internship.title,
                  internship_company:
                    internship.company_name,
                })
              );

            allApplications = [
              ...allApplications,
              ...applicationsWithInternship,
            ];
          }
        } catch (error) {
          console.error(
            `Unable to load applications for internship ${internship.id}:`,
            error
          );
        }
      }

      setApplications(allApplications);
    } catch (error) {
      console.error(
        "Company applications error:",
        error
      );

      alert(
        "Unable to load student applications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (
    applicationId,
    newStatus
  ) => {
    try {
      setUpdatingId(applicationId);

      const response = await fetch(
        `http://127.0.0.1:8000/api/applications/${applicationId}/status?status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${user?.token || ""}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail
            ? typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail)
            : "Unable to update application status."
        );
      }

      alert(
        `Application ${newStatus} successfully.`
      );

      if (user) {
        await loadApplications(user.user_id);
      }
    } catch (error) {
      console.error(
        "Update application status error:",
        error
      );

      alert(
        error.message ||
          "Something went wrong while updating the application."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = (applicationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to accept this student?"
    );

    if (!confirmed) {
      return;
    }

    updateApplicationStatus(
      applicationId,
      "accepted"
    );
  };

  const handleReject = (applicationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this application?"
    );

    if (!confirmed) {
      return;
    }

    updateApplicationStatus(
      applicationId,
      "rejected"
    );
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
            Loading student applications...
          </p>
        </div>
      </div>
    );
  }

  const pendingApplications =
    applications.filter(
      (application) =>
        application.status === "pending"
    ).length;

  const acceptedApplications =
    applications.filter(
      (application) =>
        application.status === "accepted"
    ).length;

  const rejectedApplications =
    applications.filter(
      (application) =>
        application.status === "rejected"
    ).length;

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            Student Applications
          </h1>

          <p className="text-muted mb-0">
            Review and manage applications from students.
          </p>
        </div>

        <Link
          to="/company/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Total Applications
              </h6>

              <h2 className="fw-bold mb-0">
                {applications.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Pending
              </h6>

              <h2 className="fw-bold text-warning mb-0">
                {pendingApplications}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Accepted
              </h6>

              <h2 className="fw-bold text-success mb-0">
                {acceptedApplications}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Rejected
              </h6>

              <h2 className="fw-bold text-danger mb-0">
                {rejectedApplications}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <h4 className="fw-bold mb-2">
              No Student Applications Yet
            </h4>

            <p className="text-muted mb-0">
              Students who apply for your internships
              will appear here.
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
              <div className="card shadow-sm h-100">
                <div className="card-body">

                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h4 className="fw-bold mb-1">
                        {application.internship_title}
                      </h4>

                      <p className="text-muted mb-0">
                        {application.internship_company}
                      </p>
                    </div>

                    <span
                      className={`badge ${
                        application.status ===
                        "accepted"
                          ? "bg-success"
                          : application.status ===
                            "rejected"
                          ? "bg-danger"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {application.status}
                    </span>
                  </div>

                  <hr />

                  <p className="mb-2">
                    <strong>Student ID:</strong>{" "}
                    {application.student_id}
                  </p>

                  <p className="mb-3">
                    <strong>Application ID:</strong>{" "}
                    {application.id}
                  </p>

                  {application.applied_at && (
                    <p className="text-muted mb-3">
                      Applied on:{" "}
                      {new Date(
                        application.applied_at
                      ).toLocaleString()}
                    </p>
                  )}

                  {application.status ===
                    "pending" && (
                    <div className="d-flex gap-2">

                      <button
                        type="button"
                        className="btn btn-success flex-grow-1"
                        disabled={
                          updatingId ===
                          application.id
                        }
                        onClick={() =>
                          handleAccept(
                            application.id
                          )
                        }
                      >
                        {updatingId ===
                        application.id
                          ? "Updating..."
                          : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger flex-grow-1"
                        disabled={
                          updatingId ===
                          application.id
                        }
                        onClick={() =>
                          handleReject(
                            application.id
                          )
                        }
                      >
                        Reject
                      </button>

                    </div>
                  )}

                  {application.status ===
                    "accepted" && (
                    <div className="alert alert-success mb-0">
                      This student has been accepted.
                    </div>
                  )}

                  {application.status ===
                    "rejected" && (
                    <div className="alert alert-danger mb-0">
                      This application has been rejected.
                    </div>
                  )}

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {internships.length > 0 && (
        <p className="text-muted text-center mt-4 mb-0">
          You currently have{" "}
          <strong>{internships.length}</strong>{" "}
          internship
          {internships.length !== 1
            ? "s"
            : ""}{" "}
          posted.
        </p>
      )}
    </div>
  );
}

export default CompanyApplications;
