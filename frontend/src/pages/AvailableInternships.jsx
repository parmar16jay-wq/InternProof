import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function AvailableInternships() {
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredInternships = internships.filter((internship) => {
    const searchableText = [internship.title, internship.company_name, internship.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchableText.includes(searchQuery.trim().toLowerCase());
  });

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

      {!loading && internships.length > 0 && (
        <section className="mb-4" aria-label="Search internships">
          <label htmlFor="internship-search" className="visually-hidden">Search internships by role, company, or location</label>
          <div className="d-flex align-items-center gap-3 px-4 py-2 bg-white shadow-sm" style={{ minHeight: 64, border: "1px solid #e4e7f0", borderRadius: 999, maxWidth: 980 }}>
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#5b5cff" strokeWidth="2" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input id="internship-search" className="form-control border-0 shadow-none p-0" style={{ minWidth: 0, background: "transparent" }} type="search" placeholder="Search roles, companies, or locations" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            {searchQuery && <button type="button" className="btn btn-sm rounded-pill px-3" style={{ color: "#5b5cff", backgroundColor: "#f0f0ff", whiteSpace: "nowrap" }} onClick={() => setSearchQuery("")}>Clear</button>}
          </div>
          <div className="small text-muted mt-2 ms-3">Showing {filteredInternships.length} of {internships.length} internships</div>
        </section>
      )}


      {/* ====================================
          INTERNSHIP CARDS
      ==================================== */}

      {!loading && internships.length > 0 && filteredInternships.length > 0 && (

        <div className="row g-4">

          {filteredInternships.map((internship) => (

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

      {!loading && internships.length > 0 && filteredInternships.length === 0 && (
        <div className="alert alert-info">No internships match those filters. Try changing or clearing your search.</div>
      )}

    </div>
  );
}

export default AvailableInternships;
