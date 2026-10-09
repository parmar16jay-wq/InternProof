import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminColleges() {
  const navigate = useNavigate();

  const [colleges, setColleges] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user"));

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }

    loadCollegeData();
  }, [navigate]);

  const loadCollegeData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, internshipsResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/users", { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } }),
        fetch("http://127.0.0.1:8000/api/internships"),
      ]);

      if (!usersResponse.ok) {
        throw new Error("Unable to load users.");
      }

      if (!internshipsResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const usersData = await usersResponse.json();
      const internshipsData = await internshipsResponse.json();

      const collegeUsers = usersData.filter(
        (item) => item.role === "college"
      );

      setColleges(collegeUsers);
      setInternships(internshipsData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const getCollegeInternships = (collegeId) => {
    return internships.filter(
      (internship) => internship.created_by === collegeId
    );
  };

  const getActiveInternships = (collegeId) => {
    return getCollegeInternships(collegeId).filter(
      (internship) => internship.status === "active"
    );
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary"></div>

        <p className="mt-3">
          Loading colleges...
        </p>
      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Manage Colleges
          </h1>

          <p className="text-muted mb-0">
            View and monitor registered colleges on the InternProof platform.
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

      {/* SUMMARY CARDS */}
      <div className="row g-4 mb-5">

        {/* TOTAL COLLEGES */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Colleges
              </h6>

              <h2 className="fw-bold text-primary">
                {colleges.length}
              </h2>

              <p className="mb-0 text-muted">
                Registered colleges
              </p>

            </div>

          </div>
        </div>

        {/* TOTAL INTERNSHIPS */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold text-success">
                {internships.length}
              </h2>

              <p className="mb-0 text-muted">
                Internships on platform
              </p>

            </div>

          </div>
        </div>

        {/* ACTIVE INTERNSHIPS */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Active Internships
              </h6>

              <h2 className="fw-bold text-info">
                {
                  internships.filter(
                    (internship) =>
                      internship.status === "active"
                  ).length
                }
              </h2>

              <p className="mb-0 text-muted">
                Currently active
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* COLLEGE DIRECTORY */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <div>
              <h3 className="fw-bold mb-1">
                College Directory
              </h3>

              <p className="text-muted mb-0">
                List of all registered colleges.
              </p>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={loadCollegeData}
            >
              🔄 Refresh
            </button>

          </div>

          {colleges.length === 0 ? (

            <div className="alert alert-info mb-0">
              No colleges are registered yet.
            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">

                  <tr>
                    <th>College ID</th>
                    <th>College Name</th>
                    <th>Email</th>
                    <th>Internships</th>
                    <th>Active</th>
                    <th>Created Date</th>
                  </tr>

                </thead>

                <tbody>

                  {colleges.map((college) => {

                    const collegeInternships =
                      getCollegeInternships(college.id);

                    const activeInternships =
                      getActiveInternships(college.id);

                    return (
                      <tr key={college.id}>

                        {/* COLLEGE ID */}
                        <td>
                          <span className="badge bg-secondary">
                            {college.id}
                          </span>
                        </td>

                        {/* COLLEGE NAME */}
                        <td>
                          <strong>
                            {college.full_name || "College"}
                          </strong>
                        </td>

                        {/* EMAIL */}
                        <td>
                          {college.email}
                        </td>

                        {/* INTERNSHIPS */}
                        <td>
                          <span className="badge bg-success">
                            {collegeInternships.length}
                          </span>
                        </td>

                        {/* ACTIVE */}
                        <td>
                          <span className="badge bg-info">
                            {activeInternships.length}
                          </span>
                        </td>

                        {/* CREATED DATE */}
                        <td>
                          {college.created_at
                            ? new Date(
                                college.created_at
                              ).toLocaleDateString()
                            : "N/A"}
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

      {/* COLLEGE ACTIVITY */}
      <div>

        <h3 className="fw-bold mb-3">
          College Activity
        </h3>

        {colleges.length === 0 ? (

          <div className="alert alert-info">
            No college activity available.
          </div>

        ) : (

          <div className="row g-4">

            {colleges.map((college) => {

              const collegeInternships =
                getCollegeInternships(college.id);

              const activeInternships =
                getActiveInternships(college.id);

              return (
                <div
                  className="col-md-6 col-lg-4"
                  key={college.id}
                >

                  <div className="card border-0 shadow-sm h-100">

                    <div className="card-body">

                      {/* COLLEGE HEADER */}
                      <div className="d-flex justify-content-between align-items-start mb-3">

                        <div>

                          <h5 className="fw-bold mb-1">
                            🎓 {college.full_name || "College"}
                          </h5>

                          <small className="text-muted">
                            College ID: {college.id}
                          </small>

                        </div>

                        <span className="badge bg-primary">
                          College
                        </span>

                      </div>

                      {/* EMAIL */}
                      <p className="mb-3">
                        <strong>Email:</strong>{" "}
                        {college.email}
                      </p>

                      {/* STATISTICS */}
                      <div className="row g-2">

                        <div className="col-6">

                          <div className="bg-light rounded p-3">

                            <small className="text-muted">
                              Internships
                            </small>

                            <h4 className="fw-bold mb-0">
                              {collegeInternships.length}
                            </h4>

                          </div>

                        </div>

                        <div className="col-6">

                          <div className="bg-light rounded p-3">

                            <small className="text-muted">
                              Active
                            </small>

                            <h4 className="fw-bold mb-0">
                              {activeInternships.length}
                            </h4>

                          </div>

                        </div>

                      </div>

                      <hr />

                      {/* CREATED DATE */}
                      <p className="text-muted small mb-0">

                        Created:{" "}

                        {college.created_at
                          ? new Date(
                              college.created_at
                            ).toLocaleDateString()
                          : "N/A"}

                      </p>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}

export default AdminColleges;
