import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const [selectedRole, setSelectedRole] = useState("all");
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

      loadUsers();
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/api/users",
        { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load users."
        );
      }

      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);

      setError(
        error.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTER USERS
  // =====================================================

  const handleRoleFilter = (role) => {
    setSelectedRole(role);

    if (role === "all") {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) => user.role === role
    );

    setFilteredUsers(filtered);
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return "N/A";
    }

    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // =====================================================
  // ROLE BADGE
  // =====================================================

  const getRoleBadge = (role) => {
    if (role === "admin") {
      return (
        <span className="badge bg-danger">
          Admin
        </span>
      );
    }

    if (role === "student") {
      return (
        <span className="badge bg-primary">
          Student
        </span>
      );
    }

    if (role === "company") {
      return (
        <span className="badge bg-success">
          Company
        </span>
      );
    }

    if (role === "college") {
      return (
        <span className="badge bg-warning text-dark">
          College
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        {role}
      </span>
    );
  };

  // =====================================================
  // USER COUNTS
  // =====================================================

  const totalUsers = users.length;

  const studentCount = users.filter(
    (user) => user.role === "student"
  ).length;

  const companyCount = users.filter(
    (user) => user.role === "company"
  ).length;

  const collegeCount = users.filter(
    (user) => user.role === "college"
  ).length;

  const adminCount = users.filter(
    (user) => user.role === "admin"
  ).length;

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
            Manage Users
          </h1>

          <p className="text-muted mb-0">
            View and manage all registered users
            on the InternProof platform.
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

        {/* Total Users */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Users
              </h6>

              <h2 className="fw-bold">
                {totalUsers}
              </h2>

            </div>

          </div>

        </div>


        {/* Students */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Students
              </h6>

              <h2 className="fw-bold text-primary">
                {studentCount}
              </h2>

            </div>

          </div>

        </div>


        {/* Companies */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Companies
              </h6>

              <h2 className="fw-bold text-success">
                {companyCount}
              </h2>

            </div>

          </div>

        </div>


        {/* Colleges */}

        <div className="col-md-3">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Colleges
              </h6>

              <h2 className="fw-bold text-warning">
                {collegeCount}
              </h2>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          FILTER SECTION
      ================================================= */}

      <div className="card shadow-sm border-0 mb-4">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">

            <div>
              <h5 className="fw-bold mb-1">
                User Directory
              </h5>

              <p className="text-muted mb-0">
                Filter users according to their role.
              </p>
            </div>


            <div>

              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) =>
                  handleRoleFilter(
                    e.target.value
                  )
                }
              >

                <option value="all">
                  All Users
                </option>

                <option value="student">
                  Students
                </option>

                <option value="company">
                  Companies
                </option>

                <option value="college">
                  Colleges
                </option>

                <option value="admin">
                  Admins
                </option>

              </select>

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
            Loading users...
          </p>

        </div>

      ) : (

        /* =================================================
           USER TABLE
        ================================================= */

        <div className="card shadow-sm border-0">

          <div className="card-body">

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead className="table-light">

                  <tr>

                    <th>
                      ID
                    </th>

                    <th>
                      Full Name
                    </th>

                    <th>
                      Email
                    </th>

                    <th>
                      Role
                    </th>

                    <th>
                      Created Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredUsers.length === 0 ? (

                    <tr>

                      <td
                        colSpan="5"
                        className="text-center py-5"
                      >

                        <h5 className="fw-bold">
                          No Users Found
                        </h5>

                        <p className="text-muted mb-0">
                          There are no users
                          matching this filter.
                        </p>

                      </td>

                    </tr>

                  ) : (

                    filteredUsers.map((user) => (

                      <tr key={user.id}>

                        <td>
                          <strong>
                            #{user.id}
                          </strong>
                        </td>

                        <td>
                          {user.full_name}
                        </td>

                        <td>
                          {user.email}
                        </td>

                        <td>
                          {getRoleBadge(
                            user.role
                          )}
                        </td>

                        <td>
                          {formatDate(
                            user.created_at
                          )}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          ADMIN INFORMATION
      ================================================= */}

      <div className="card shadow-sm border-0 mt-4">

        <div className="card-body">

          <h5 className="fw-bold mb-2">
            User Management
          </h5>

          <p className="text-muted mb-0">
            This section allows administrators
            to monitor registered students,
            companies, colleges and other
            administrators on the InternProof
            platform.
          </p>

        </div>

      </div>

    </div>
  );
}

export default AdminUsers;
