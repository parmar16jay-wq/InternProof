import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminCompanies() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);

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

      loadData();
    } catch (err) {
      console.error("Invalid user data:", err);
      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // =====================================================
  // LOAD COMPANY DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all users
      const usersResponse = await fetch(
        "http://127.0.0.1:8000/api/users"
      );

      if (!usersResponse.ok) {
        throw new Error("Unable to load users.");
      }

      const usersData = await usersResponse.json();

      // Get all internships
      const internshipsResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipsResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipsData = await internshipsResponse.json();

      // Get applications for every internship
      let allApplications = [];

      for (const internship of internshipsData) {
        try {
          const applicationsResponse = await fetch(
            `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
          );

          if (applicationsResponse.ok) {
            const applicationData =
              await applicationsResponse.json();

            allApplications = [
              ...allApplications,
              ...applicationData,
            ];
          }
        } catch (err) {
          console.error(
            `Could not load applications for internship ${internship.id}`,
            err
          );
        }
      }

      setUsers(usersData);
      setInternships(internshipsData);
      setApplications(allApplications);
    } catch (err) {
      console.error("Admin company data error:", err);
      setError(err.message || "Unable to load company data.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GET COMPANIES
  // =====================================================

  const companies = users.filter(
    (user) => user.role === "company"
  );

  // =====================================================
  // COMPANY STATISTICS
  // =====================================================

  const getCompanyInternships = (companyId) => {
    return internships.filter(
      (internship) => internship.created_by === companyId
    );
  };

  const getCompanyApplications = (companyId) => {
    const companyInternshipIds = getCompanyInternships(
      companyId
    ).map((internship) => internship.id);

    return applications.filter((application) =>
      companyInternshipIds.includes(application.internship_id)
    );
  };

  const getActiveInternships = (companyId) => {
    return getCompanyInternships(companyId).filter(
      (internship) =>
        internship.status?.toLowerCase() === "active"
    );
  };

  const getAcceptedApplications = (companyId) => {
    return getCompanyApplications(companyId).filter(
      (application) =>
        application.status?.toLowerCase() === "accepted"
    );
  };

  // =====================================================
  // TOTAL STATISTICS
  // =====================================================

  const totalCompanies = companies.length;

  const totalInternships = internships.length;

  const activeInternships = internships.filter(
    (internship) =>
      internship.status?.toLowerCase() === "active"
  ).length;

  const totalApplications = applications.length;

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="container py-5">

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h1 className="fw-bold">
              Manage Companies
            </h1>

            <p className="text-muted mb-0">
              Loading registered companies...
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>

        </div>

        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          ></div>

          <p className="text-muted mt-3">
            Loading company information...
          </p>
        </div>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="container py-5">

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h1 className="fw-bold">
              Manage Companies
            </h1>

            <p className="text-muted mb-0">
              View and manage registered companies.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>

        </div>

        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>

        <button
          className="btn btn-primary"
          onClick={loadData}
        >
          Try Again
        </button>

      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div className="container py-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Manage Companies
          </h1>

          <p className="text-muted mb-0">
            View and manage all registered companies on
            the InternProof platform.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Back to Dashboard
        </button>

      </div>


      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="row g-4 mb-4">

        {/* Total Companies */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Companies
              </h6>

              <h2 className="fw-bold text-primary mb-0">
                {totalCompanies}
              </h2>

            </div>

          </div>

        </div>


        {/* Total Internships */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold text-success mb-0">
                {totalInternships}
              </h2>

            </div>

          </div>

        </div>


        {/* Active Internships */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Active Internships
              </h6>

              <h2 className="fw-bold text-warning mb-0">
                {activeInternships}
              </h2>

            </div>

          </div>

        </div>


        {/* Applications */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Applications
              </h6>

              <h2 className="fw-bold text-info mb-0">
                {totalApplications}
              </h2>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          COMPANY DIRECTORY
      ================================================= */}

      <div className="card shadow-sm border-0">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center mb-3">

            <div>

              <h4 className="fw-bold mb-1">
                Company Directory
              </h4>

              <p className="text-muted mb-0">
                Registered companies and their platform
                activity.
              </p>

            </div>

            <button
              className="btn btn-outline-primary"
              onClick={loadData}
            >
              ↻ Refresh
            </button>

          </div>


          {/* =================================================
              NO COMPANIES
          ================================================= */}

          {companies.length === 0 ? (

            <div className="text-center py-5">

              <div
                className="fs-1 mb-3"
              >
                🏢
              </div>

              <h5 className="fw-bold">
                No Companies Found
              </h5>

              <p className="text-muted mb-0">
                No company accounts are registered
                on the platform yet.
              </p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead>

                  <tr>

                    <th>ID</th>

                    <th>Company Name</th>

                    <th>Email</th>

                    <th>Internships</th>

                    <th>Active</th>

                    <th>Applications</th>

                    <th>Accepted</th>

                    <th>Created Date</th>

                  </tr>

                </thead>

                <tbody>

                  {companies.map((company) => {

                    const companyInternships =
                      getCompanyInternships(company.id);

                    const companyApplications =
                      getCompanyApplications(company.id);

                    const active =
                      getActiveInternships(company.id);

                    const accepted =
                      getAcceptedApplications(company.id);

                    return (

                      <tr key={company.id}>

                        {/* ID */}

                        <td className="fw-bold">
                          #{company.id}
                        </td>


                        {/* Company Name */}

                        <td>

                          <strong>
                            {company.full_name}
                          </strong>

                        </td>


                        {/* Email */}

                        <td>
                          {company.email}
                        </td>


                        {/* Internships */}

                        <td>

                          <span className="badge bg-primary">
                            {companyInternships.length}
                          </span>

                        </td>


                        {/* Active */}

                        <td>

                          <span className="badge bg-success">
                            {active.length}
                          </span>

                        </td>


                        {/* Applications */}

                        <td>

                          <span className="badge bg-info text-dark">
                            {companyApplications.length}
                          </span>

                        </td>


                        {/* Accepted */}

                        <td>

                          <span className="badge bg-warning text-dark">
                            {accepted.length}
                          </span>

                        </td>


                        {/* Created Date */}

                        <td>
                          {formatDate(company.created_at)}
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


      {/* =================================================
          COMPANY DETAILS CARDS
      ================================================= */}

      {companies.length > 0 && (

        <div className="mt-4">

          <h4 className="fw-bold mb-3">
            Company Activity
          </h4>

          <div className="row g-4">

            {companies.map((company) => {

              const companyInternships =
                getCompanyInternships(company.id);

              const companyApplications =
                getCompanyApplications(company.id);

              const active =
                getActiveInternships(company.id);

              const accepted =
                getAcceptedApplications(company.id);

              return (

                <div
                  className="col-md-6"
                  key={`card-${company.id}`}
                >

                  <div className="card shadow-sm h-100">

                    <div className="card-body">

                      <div className="d-flex justify-content-between align-items-start">

                        <div>

                          <h5 className="fw-bold mb-1">
                            🏢 {company.full_name}
                          </h5>

                          <p className="text-muted mb-3">
                            {company.email}
                          </p>

                        </div>

                        <span className="badge bg-success">
                          Company
                        </span>

                      </div>


                      <div className="row g-3">

                        <div className="col-6">

                          <div className="border rounded p-3">

                            <small className="text-muted">
                              Internships
                            </small>

                            <h5 className="fw-bold mb-0">
                              {companyInternships.length}
                            </h5>

                          </div>

                        </div>


                        <div className="col-6">

                          <div className="border rounded p-3">

                            <small className="text-muted">
                              Active
                            </small>

                            <h5 className="fw-bold text-success mb-0">
                              {active.length}
                            </h5>

                          </div>

                        </div>


                        <div className="col-6">

                          <div className="border rounded p-3">

                            <small className="text-muted">
                              Applications
                            </small>

                            <h5 className="fw-bold text-info mb-0">
                              {companyApplications.length}
                            </h5>

                          </div>

                        </div>


                        <div className="col-6">

                          <div className="border rounded p-3">

                            <small className="text-muted">
                              Accepted
                            </small>

                            <h5 className="fw-bold text-warning mb-0">
                              {accepted.length}
                            </h5>

                          </div>

                        </div>

                      </div>


                      <hr />


                      <p className="text-muted mb-0">

                        <strong>
                          Registered:
                        </strong>{" "}

                        {formatDate(company.created_at)}

                      </p>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminCompanies;