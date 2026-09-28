import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function AvailableInternships() {
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ----------------------------------------
  // Get logged-in student
  // ----------------------------------------

  const savedUser = sessionStorage.getItem("user");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("User data error:", error);
  }

  // ----------------------------------------
  // Load internships and applications
  // ----------------------------------------

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all available internships
      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData =
        await internshipResponse.json();

      setInternships(internshipData);

      // Get student's applications
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/student/${user.user_id}`
      );

      if (applicationResponse.ok) {
        const applicationData =
          await applicationResponse.json();

        setApplications(applicationData);
      }

    } catch (error) {
      console.error(
        "Loading internships error:",
        error
      );

      setError(
        "Unable to load internships. Make sure the backend is running."
      );

    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Check whether student already applied
  // ----------------------------------------

  const hasApplied = (internshipId) => {
    return applications.some(
      (application) =>
        application.internship_id === internshipId
    );
  };

  // ----------------------------------------
  // Apply for internship
  // ----------------------------------------

  const handleApply = async (internshipId) => {
    setMessage("");
    setError("");

    if (!user) {
      setError("Please login first.");
      return;
    }

    if (hasApplied(internshipId)) {
      setError(
        "You have already applied for this internship."
      );
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/applications",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },

          body: JSON.stringify({
            student_id: user.user_id,
            internship_id: internshipId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail || "Unable to apply for internship."
        );

        return;
      }

      setMessage(
        "Application submitted successfully!"
      );

      // Reload applications
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/student/${user.user_id}`
      );

      if (applicationResponse.ok) {
        const applicationData =
          await applicationResponse.json();

        setApplications(applicationData);
      }

    } catch (error) {
      console.error(
        "Application error:",
        error
      );

      setError(
        "Unable to connect to the server."
      );
    }
  };

  // ----------------------------------------
  // Page
  // ----------------------------------------

  return (
    <div className="container py-4">

      {/* ====================================
          HEADER
      ==================================== */}

      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>

          <h1 className="fw-bold mb-2">
            Available Internships
          </h1>

          <p className="text-muted mb-0">
            Find an internship and apply for it.
          </p>

        </div>

        {/* Back to Dashboard */}
        <Link
          to="/student/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>

      </div>


      {/* ====================================
          SUCCESS MESSAGE
      ==================================== */}

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}


      {/* ====================================
          ERROR MESSAGE
      ==================================== */}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}


      {/* ====================================
          LOADING
      ==================================== */}

      {loading && (
        <div className="text-center py-5">

          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <p className="mt-3 text-muted">
            Loading internships...
          </p>

        </div>
      )}


      {/* ====================================
          NO INTERNSHIPS
      ==================================== */}

      {!loading && internships.length === 0 && (
        <div className="alert alert-info">
          No internships are currently available.
        </div>
      )}


      {/* ====================================
          INTERNSHIP CARDS
      ==================================== */}

      {!loading && internships.length > 0 && (

        <div className="row g-4">

          {internships.map((internship) => (

            <div
              className="col-md-6 col-lg-4"
              key={internship.id}
            >

              <div
                className="card h-100 shadow-sm"
                style={{
                  borderRadius: "12px",
                }}
              >

                <div className="card-body p-4">

                  {/* Icon */}

                  <div
                    className="d-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "12px",
                      backgroundColor: "#e3f2fd",
                      fontSize: "32px",
                    }}
                  >
                    💼
                  </div>


                  {/* Title */}

                  <h4 className="fw-bold">
                    {internship.title}
                  </h4>


                  {/* Company */}

                  <p className="mb-2">
                    <strong>Company:</strong>{" "}
                    {internship.company_name}
                  </p>


                  {/* Location */}

                  {internship.location && (
                    <p className="mb-2">
                      <strong>Location:</strong>{" "}
                      {internship.location}
                    </p>
                  )}


                  {/* Description */}

                  <p className="text-muted">
                    {internship.description}
                  </p>


                  {/* Start Date */}

                  {internship.start_date && (
                    <p className="mb-1">
                      <strong>Start:</strong>{" "}
                      {internship.start_date}
                    </p>
                  )}


                  {/* End Date */}

                  {internship.end_date && (
                    <p className="mb-3">
                      <strong>End:</strong>{" "}
                      {internship.end_date}
                    </p>
                  )}


                  {/* Apply Button */}

                  {hasApplied(internship.id) ? (

                    <button
                      className="btn btn-secondary"
                      disabled
                    >
                      Already Applied
                    </button>

                  ) : (

                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        handleApply(internship.id)
                      }
                    >
                      Apply
                    </button>

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

export default AvailableInternships;
