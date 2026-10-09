import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminReports() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user"));

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }

    loadReports();
  }, [navigate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      // Get users
      const usersResponse = await fetch(
        "http://127.0.0.1:8000/api/users",
        { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } }
      );

      if (!usersResponse.ok) {
        throw new Error("Unable to load users.");
      }

      const usersData = await usersResponse.json();

      // Get internships
      const internshipsResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipsResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipsData = await internshipsResponse.json();

      // Get applications from every internship
      const applicationResults = await Promise.all(
        internshipsData.map(async (internship) => {
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
            );

            if (!response.ok) {
              return [];
            }

            const data = await response.json();

            return data.map((application) => ({
              ...application,
              internship_title: internship.title,
              company_name: internship.company_name,
              internship_status: internship.status,
            }));
          } catch (error) {
            console.error(
              `Error loading applications for internship ${internship.id}:`,
              error
            );

            return [];
          }
        })
      );

      const allApplications = applicationResults.flat();

      setUsers(usersData);
      setInternships(internshipsData);
      setApplications(allApplications);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to load platform reports."
      );
    } finally {
      setLoading(false);
    }
  };

  // USER COUNTS
  const totalStudents = users.filter(
    (item) => item.role === "student"
  ).length;

  const totalCompanies = users.filter(
    (item) => item.role === "company"
  ).length;

  const totalColleges = users.filter(
    (item) => item.role === "college"
  ).length;

  // INTERNSHIP COUNTS
  const activeInternships = internships.filter(
    (item) => item.status === "active"
  ).length;

  const inactiveInternships = internships.filter(
    (item) => item.status !== "active"
  ).length;

  // APPLICATION COUNTS
  const totalApplications = applications.length;

  const acceptedApplications = applications.filter(
    (item) => item.status === "accepted"
  ).length;

  const pendingApplications = applications.filter(
    (item) => item.status === "pending"
  ).length;

  const rejectedApplications = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  const acceptanceRate =
    totalApplications > 0
      ? ((acceptedApplications / totalApplications) * 100).toFixed(1)
      : 0;

  const rejectionRate =
    totalApplications > 0
      ? ((rejectedApplications / totalApplications) * 100).toFixed(1)
      : 0;

  const pendingRate =
    totalApplications > 0
      ? ((pendingApplications / totalApplications) * 100).toFixed(1)
      : 0;

  if (loading) {
    return (
      <div className="container mt-5 text-center">

        <div className="spinner-border text-primary"></div>

        <p className="mt-3">
          Loading platform reports...
        </p>

      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* =========================
          HEADER
      ========================== */}
      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Platform Reports
          </h1>

          <p className="text-muted mb-0">
            View overall statistics and activity across the InternProof platform.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Back to Dashboard
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* =========================
          USER SUMMARY
      ========================== */}
      <h3 className="fw-bold mb-3">
        User Overview
      </h3>

      <div className="row g-4 mb-5">

        {/* TOTAL USERS */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Users
              </h6>

              <h2 className="fw-bold text-primary">
                {users.length}
              </h2>

              <p className="text-muted mb-0">
                All registered users
              </p>

            </div>

          </div>
        </div>

        {/* STUDENTS */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Students
              </h6>

              <h2 className="fw-bold text-success">
                {totalStudents}
              </h2>

              <p className="text-muted mb-0">
                Registered students
              </p>

            </div>

          </div>
        </div>

        {/* COMPANIES */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Companies
              </h6>

              <h2 className="fw-bold text-info">
                {totalCompanies}
              </h2>

              <p className="text-muted mb-0">
                Registered companies
              </p>

            </div>

          </div>
        </div>

        {/* COLLEGES */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Colleges
              </h6>

              <h2 className="fw-bold text-warning">
                {totalColleges}
              </h2>

              <p className="text-muted mb-0">
                Registered colleges
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* =========================
          INTERNSHIP SUMMARY
      ========================== */}
      <h3 className="fw-bold mb-3">
        Internship Overview
      </h3>

      <div className="row g-4 mb-5">

        {/* TOTAL INTERNSHIPS */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold text-primary">
                {internships.length}
              </h2>

              <p className="text-muted mb-0">
                All internships created
              </p>

            </div>

          </div>
        </div>

        {/* ACTIVE */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Active Internships
              </h6>

              <h2 className="fw-bold text-success">
                {activeInternships}
              </h2>

              <p className="text-muted mb-0">
                Currently active
              </p>

            </div>

          </div>
        </div>

        {/* INACTIVE */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Inactive Internships
              </h6>

              <h2 className="fw-bold text-secondary">
                {inactiveInternships}
              </h2>

              <p className="text-muted mb-0">
                Not currently active
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* =========================
          APPLICATION SUMMARY
      ========================== */}
      <h3 className="fw-bold mb-3">
        Application Overview
      </h3>

      <div className="row g-4 mb-5">

        {/* TOTAL */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Applications
              </h6>

              <h2 className="fw-bold text-primary">
                {totalApplications}
              </h2>

              <p className="text-muted mb-0">
                Applications received
              </p>

            </div>

          </div>
        </div>

        {/* ACCEPTED */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Accepted
              </h6>

              <h2 className="fw-bold text-success">
                {acceptedApplications}
              </h2>

              <p className="text-muted mb-0">
                {acceptanceRate}% acceptance rate
              </p>

            </div>

          </div>
        </div>

        {/* PENDING */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Pending
              </h6>

              <h2 className="fw-bold text-warning">
                {pendingApplications}
              </h2>

              <p className="text-muted mb-0">
                {pendingRate}% pending
              </p>

            </div>

          </div>
        </div>

        {/* REJECTED */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Rejected
              </h6>

              <h2 className="fw-bold text-danger">
                {rejectedApplications}
              </h2>

              <p className="text-muted mb-0">
                {rejectionRate}% rejected
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* =========================
          APPLICATION REPORT
      ========================== */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <div>
              <h3 className="fw-bold mb-1">
                Application Report
              </h3>

              <p className="text-muted mb-0">
                Current application status across all internships.
              </p>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={loadReports}
            >
              🔄 Refresh
            </button>

          </div>

          {/* ACCEPTED */}
          <div className="mb-4">

            <div className="d-flex justify-content-between mb-1">

              <span className="fw-semibold">
                Accepted Applications
              </span>

              <span>
                {acceptedApplications}
              </span>

            </div>

            <div className="progress" style={{ height: "10px" }}>

              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{
                  width: `${acceptanceRate}%`,
                }}
              ></div>

            </div>

          </div>

          {/* PENDING */}
          <div className="mb-4">

            <div className="d-flex justify-content-between mb-1">

              <span className="fw-semibold">
                Pending Applications
              </span>

              <span>
                {pendingApplications}
              </span>

            </div>

            <div className="progress" style={{ height: "10px" }}>

              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{
                  width: `${pendingRate}%`,
                }}
              ></div>

            </div>

          </div>

          {/* REJECTED */}
          <div>

            <div className="d-flex justify-content-between mb-1">

              <span className="fw-semibold">
                Rejected Applications
              </span>

              <span>
                {rejectedApplications}
              </span>

            </div>

            <div className="progress" style={{ height: "10px" }}>

              <div
                className="progress-bar bg-danger"
                role="progressbar"
                style={{
                  width: `${rejectionRate}%`,
                }}
              ></div>

            </div>

          </div>

        </div>

      </div>

      {/* =========================
          INTERNSHIP REPORT TABLE
      ========================== */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <h3 className="fw-bold mb-1">
            Internship Report
          </h3>

          <p className="text-muted mb-4">
            Internship-wise application statistics.
          </p>

          {internships.length === 0 ? (

            <div className="alert alert-info mb-0">
              No internships available.
            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">

                  <tr>
                    <th>Internship</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Applications</th>
                    <th>Accepted</th>
                    <th>Pending</th>
                    <th>Rejected</th>
                  </tr>

                </thead>

                <tbody>

                  {internships.map((internship) => {

                    const internshipApplications =
                      applications.filter(
                        (application) =>
                          application.internship_id ===
                          internship.id
                      );

                    const accepted =
                      internshipApplications.filter(
                        (application) =>
                          application.status === "accepted"
                      ).length;

                    const pending =
                      internshipApplications.filter(
                        (application) =>
                          application.status === "pending"
                      ).length;

                    const rejected =
                      internshipApplications.filter(
                        (application) =>
                          application.status === "rejected"
                      ).length;

                    return (
                      <tr key={internship.id}>

                        <td>
                          <strong>
                            {internship.title}
                          </strong>

                          <br />

                          <small className="text-muted">
                            ID: {internship.id}
                          </small>
                        </td>

                        <td>
                          {internship.company_name}
                        </td>

                        <td>

                          <span
                            className={`badge ${
                              internship.status === "active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {internship.status}
                          </span>

                        </td>

                        <td>
                          <span className="badge bg-primary">
                            {internshipApplications.length}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-success">
                            {accepted}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-warning text-dark">
                            {pending}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-danger">
                            {rejected}
                          </span>
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* =========================
          REPORT INFORMATION
      ========================== */}
      <div className="alert alert-light border">

        <strong>Report Summary:</strong>

        <span className="ms-2">
          The report displays current platform statistics based on
          registered users, internships, and applications.
        </span>

      </div>

    </div>
  );
}

export default AdminReports;
