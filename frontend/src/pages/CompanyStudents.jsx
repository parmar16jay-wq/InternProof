import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyStudents() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
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
      loadAcceptedStudents(userData.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadAcceptedStudents = async (companyId) => {
    try {
      setLoading(true);

      // Get all internships
      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData =
        await internshipResponse.json();

      // Get only this company's internships
      const companyInternships =
        internshipData.filter(
          (internship) =>
            internship.created_by === companyId
        );

      let acceptedStudents = [];

      // Get applications for each internship
      for (const internship of companyInternships) {
        try {
          const applicationResponse =
            await fetch(
              `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
            );

          if (!applicationResponse.ok) {
            continue;
          }

          const applicationData =
            await applicationResponse.json();

          // Keep only accepted applications
          const acceptedApplications =
            applicationData.filter(
              (application) =>
                application.status === "accepted"
            );

          const studentsWithInternship =
            acceptedApplications.map(
              (application) => ({
                ...application,
                internship_title:
                  internship.title,
                internship_company:
                  internship.company_name,
                internship_location:
                  internship.location,
                internship_start_date:
                  internship.start_date,
                internship_end_date:
                  internship.end_date,
              })
            );

          acceptedStudents = [
            ...acceptedStudents,
            ...studentsWithInternship,
          ];
        } catch (error) {
          console.error(
            `Unable to load applications for internship ${internship.id}:`,
            error
          );
        }
      }

      setStudents(acceptedStudents);
    } catch (error) {
      console.error(
        "Accepted students error:",
        error
      );

      alert(
        "Unable to load accepted students. Please try again."
      );
    } finally {
      setLoading(false);
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
            Loading accepted students...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            Accepted Students
          </h1>

          <p className="text-muted mb-0">
            View students who have been accepted for your internships.
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
      <div className="row mb-4">

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">
                Accepted Students
              </h6>

              <h2 className="fw-bold text-success mb-0">
                {students.length}
              </h2>
            </div>
          </div>
        </div>

      </div>

      {/* No Students */}
      {students.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">

            <h4 className="fw-bold mb-2">
              No Accepted Students Yet
            </h4>

            <p className="text-muted mb-0">
              Students you accept for your internships
              will appear here.
            </p>

          </div>
        </div>
      ) : (
        <div className="row g-4">

          {students.map((student) => (
            <div
              className="col-md-6"
              key={student.id}
            >
              <div className="card shadow-sm h-100">

                <div className="card-body">

                  {/* Internship Information */}
                  <div className="d-flex justify-content-between align-items-start mb-3">

                    <div>
                      <h4 className="fw-bold mb-1">
                        {student.internship_title}
                      </h4>

                      <p className="text-muted mb-0">
                        {student.internship_company}
                      </p>
                    </div>

                    <span className="badge bg-success">
                      Accepted
                    </span>

                  </div>

                  <hr />

                  {/* Student Information */}
                  <h5 className="fw-bold mb-3">
                    Student Information
                  </h5>

                  <p className="mb-2">
                    <strong>Student ID:</strong>{" "}
                    {student.student_id}
                  </p>

                  <p className="mb-3">
                    <strong>Application ID:</strong>{" "}
                    {student.id}
                  </p>

                  {/* Internship Details */}
                  <h5 className="fw-bold mb-3">
                    Internship Details
                  </h5>

                  <p className="mb-2">
                    <strong>Location:</strong>{" "}
                    {student.internship_location ||
                      "Not specified"}
                  </p>

                  <p className="mb-2">
                    <strong>Start Date:</strong>{" "}
                    {student.internship_start_date ||
                      "Not specified"}
                  </p>

                  <p className="mb-3">
                    <strong>End Date:</strong>{" "}
                    {student.internship_end_date ||
                      "Not specified"}
                  </p>

                  {student.applied_at && (
                    <p className="text-muted mb-0">
                      Applied on:{" "}
                      {new Date(
                        student.applied_at
                      ).toLocaleString()}
                    </p>
                  )}

                </div>

              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}

export default CompanyStudents;