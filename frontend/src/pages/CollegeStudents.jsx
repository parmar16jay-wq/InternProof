import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CollegeStudents() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
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
      loadStudentsData();
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadStudentsData = async () => {
    try {
      setLoading(true);
      setError("");

      // ----------------------------------------
      // Load all internships
      // ----------------------------------------

      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      const internshipData = await internshipResponse.json();

      if (!internshipResponse.ok) {
        throw new Error(
          typeof internshipData.detail === "string"
            ? internshipData.detail
            : "Unable to load internships."
        );
      }

      setInternships(internshipData);

      // ----------------------------------------
      // Load applications from every internship
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
            "Unable to load applications:",
            error
          );
        }
      }

      setApplications(allApplications);

      // ----------------------------------------
      // Get unique student IDs
      // ----------------------------------------

      const studentIds = [
        ...new Set(
          allApplications.map(
            (application) =>
              Number(application.student_id)
          )
        ),
      ];

      // ----------------------------------------
      // Create student information
      // ----------------------------------------
      // Current backend application API gives us
      // student_id but does not provide student
      // name/email.
      //
      // Therefore we display Student ID and
      // internship/application information.
      // ----------------------------------------

      const studentList = studentIds.map(
        (studentId) => {
          const studentApplications =
            allApplications.filter(
              (application) =>
                Number(application.student_id) ===
                Number(studentId)
            );

          const latestApplication =
            studentApplications[
              studentApplications.length - 1
            ];

          const internship =
            internshipData.find(
              (item) =>
                Number(item.id) ===
                Number(
                  latestApplication?.internship_id
                )
            );

          let studentStatus = "Not Applied";

          if (studentApplications.length > 0) {
            const hasAccepted =
              studentApplications.some(
                (application) =>
                  application.status ===
                  "accepted"
              );

            const hasPending =
              studentApplications.some(
                (application) =>
                  application.status ===
                  "pending"
              );

            const hasRejected =
              studentApplications.some(
                (application) =>
                  application.status ===
                  "rejected"
              );

            if (hasAccepted) {
              studentStatus =
                "Internship Active";
            } else if (hasPending) {
              studentStatus = "Applied";
            } else if (hasRejected) {
              studentStatus = "Rejected";
            }
          }

          return {
            student_id: studentId,
            applications:
              studentApplications.length,
            status: studentStatus,
            internship_title:
              internship?.title || "No Internship",
            company_name:
              internship?.company_name || "-",
            internship_id:
              latestApplication?.internship_id ||
              null,
          };
        }
      );

      setStudents(studentList);
    } catch (error) {
      console.error(
        "Error loading students:",
        error
      );

      setError(
        error.message ||
          "Unable to load student information."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Status badge
  // ----------------------------------------

  const getStatusBadge = (status) => {
    if (status === "Internship Active") {
      return (
        <span className="badge bg-success">
          Internship Active
        </span>
      );
    }

    if (status === "Applied") {
      return (
        <span className="badge bg-warning text-dark">
          Applied
        </span>
      );
    }

    if (status === "Rejected") {
      return (
        <span className="badge bg-danger">
          Rejected
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Not Applied
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
            Loading students...
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
            Students
          </h1>

          <p className="text-muted mb-0">
            Monitor students and their internship status.
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

        {/* Total Students */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <div className="d-flex align-items-center">

                <div
                  className="bg-primary text-white rounded p-3 me-3"
                  style={{ fontSize: "24px" }}
                >
                  👨‍🎓
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Total Students
                  </p>

                  <h2 className="fw-bold text-primary mb-0">
                    {students.length}
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Students with Applications */}

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
                    Students Applied
                  </p>

                  <h2 className="fw-bold text-info mb-0">
                    {
                      students.filter(
                        (student) =>
                          student.applications > 0
                      ).length
                    }
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
                  💼
                </div>

                <div>

                  <p className="text-muted mb-1">
                    Active Internships
                  </p>

                  <h2 className="fw-bold text-success mb-0">
                    {
                      students.filter(
                        (student) =>
                          student.status ===
                          "Internship Active"
                      ).length
                    }
                  </h2>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* Students List */}

      {students.length === 0 ? (

        <div className="card shadow-sm border-0">

          <div className="card-body text-center py-5">

            <div
              style={{ fontSize: "50px" }}
              className="mb-3"
            >
              👨‍🎓
            </div>

            <h4 className="fw-bold">
              No Students Found
            </h4>

            <p className="text-muted mb-0">
              There are currently no students with
              internship activity.
            </p>

          </div>

        </div>

      ) : (

        <div className="row g-4">

          {students.map((student) => (

            <div
              className="col-md-6"
              key={student.student_id}
            >

              <div className="card shadow-sm border-0 h-100">

                <div className="card-body">

                  {/* Student Header */}

                  <div className="d-flex align-items-center mb-4">

                    <div
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{
                        width: "55px",
                        height: "55px",
                        fontSize: "24px",
                      }}
                    >
                      👨‍🎓
                    </div>

                    <div>

                      <h4 className="fw-bold mb-1">
                        Student ID:{" "}
                        {student.student_id}
                      </h4>

                      <div>
                        {getStatusBadge(
                          student.status
                        )}
                      </div>

                    </div>

                  </div>


                  {/* Student Information */}

                  <div className="mb-3">

                    <p className="mb-2">

                      <strong>
                        Applications:
                      </strong>{" "}

                      {student.applications}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Internship:
                      </strong>{" "}

                      {student.internship_title}

                    </p>

                    <p className="mb-2">

                      <strong>
                        Company:
                      </strong>{" "}

                      {student.company_name}

                    </p>

                  </div>


                  {/* Internship Status */}

                  <div className="border-top pt-3">

                    <small className="text-muted">
                      Internship Status
                    </small>

                    <div className="mt-2">
                      {getStatusBadge(
                        student.status
                      )}
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

export default CollegeStudents;