import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function CollegeCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({
    totalCertificates: 0,
    totalStudents: 0,
    totalInternships: 0,
  });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (!userData) {
      window.location.href = "/login";
      return;
    }

    const user = JSON.parse(userData);

    if (user.role !== "college") {
      window.location.href = "/login";
      return;
    }

    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all internships
      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData = await internshipResponse.json();

      setInternships(internshipData);

      const certificateRows = [];

      // Get certificates for students connected to internships
      for (const internship of internshipData) {
        try {
          // Get applications for this internship
          const applicationResponse = await fetch(
            `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
          );

          if (!applicationResponse.ok) {
            continue;
          }

          const applications = await applicationResponse.json();

          // Only accepted students are part of the internship
          const acceptedApplications = applications.filter(
            (application) => application.status === "accepted"
          );

          for (const application of acceptedApplications) {
            try {
              // Get certificates for the student
              const certificateResponse = await fetch(
                `http://127.0.0.1:8000/api/certificates/student/${application.student_id}`
              );

              if (!certificateResponse.ok) {
                continue;
              }

              const studentCertificates =
                await certificateResponse.json();

              // Only show certificates belonging to this internship
              const internshipCertificates =
                studentCertificates.filter(
                  (certificate) =>
                    certificate.internship_id === internship.id
                );

              internshipCertificates.forEach((certificate) => {
                certificateRows.push({
                  ...certificate,
                  internship_title: internship.title,
                  company_name: internship.company_name,
                  location: internship.location,
                  start_date: internship.start_date,
                  end_date: internship.end_date,
                });
              });
            } catch (certificateError) {
              console.error(
                `Unable to load certificate for student ${application.student_id}`,
                certificateError
              );
            }
          }
        } catch (applicationError) {
          console.error(
            `Unable to load applications for internship ${internship.id}`,
            applicationError
          );
        }
      }

      // Remove duplicate certificates
      const uniqueCertificates = [];

      certificateRows.forEach((certificate) => {
        const alreadyExists = uniqueCertificates.some(
          (item) => item.id === certificate.id
        );

        if (!alreadyExists) {
          uniqueCertificates.push(certificate);
        }
      });

      setCertificates(uniqueCertificates);

      // Calculate summary
      const uniqueStudents = new Set(
        uniqueCertificates.map(
          (certificate) => certificate.student_id
        )
      );

      const uniqueInternships = new Set(
        uniqueCertificates.map(
          (certificate) => certificate.internship_id
        )
      );

      setSummary({
        totalCertificates: uniqueCertificates.length,
        totalStudents: uniqueStudents.size,
        totalInternships: uniqueInternships.size,
      });
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to load certificates."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not specified";
    }

    return new Date(date).toLocaleDateString();
  };

  const getCertificateUrl = (certificate) => {
    return `http://127.0.0.1:8000/api/certificates/file/${certificate.student_id}/${certificate.internship_id}`;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary mb-3"></div>

        <h5>Loading Certificates...</h5>
      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* ================= HEADER ================= */}
      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Certificates
          </h1>

          <p className="text-muted mb-0">
            Monitor certificates issued to students.
          </p>
        </div>

        <Link
          to="/college/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>

      </div>


      {/* ================= ERROR ================= */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}


      {/* ================= SUMMARY CARDS ================= */}
      <div className="row g-4 mb-4">

        {/* Total Certificates */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Certificates
              </h6>

              <h2 className="fw-bold text-primary">
                {summary.totalCertificates}
              </h2>

              <p className="text-muted mb-0">
                Certificates issued to students
              </p>

            </div>

          </div>
        </div>


        {/* Students */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Students
              </h6>

              <h2 className="fw-bold text-success">
                {summary.totalStudents}
              </h2>

              <p className="text-muted mb-0">
                Students with certificates
              </p>

            </div>

          </div>
        </div>


        {/* Internships */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Internships
              </h6>

              <h2 className="fw-bold text-info">
                {summary.totalInternships}
              </h2>

              <p className="text-muted mb-0">
                Internships with certificates
              </p>

            </div>

          </div>
        </div>

      </div>


      {/* ================= CERTIFICATES ================= */}
      <div className="card shadow-sm border-0">

        <div className="card-header bg-white py-3">

          <h4 className="fw-bold mb-1">
            Issued Certificates
          </h4>

          <p className="text-muted mb-0">
            College can monitor certificates uploaded by companies.
          </p>

        </div>


        <div className="card-body">

          {certificates.length === 0 ? (

            <div className="text-center py-5">

              <h4 className="fw-bold mb-2">
                No Certificates Yet
              </h4>

              <p className="text-muted mb-0">
                No certificates have been issued to accepted students yet.
              </p>

            </div>

          ) : (

            <div className="row g-4">

              {certificates.map((certificate) => (

                <div
                  className="col-lg-6"
                  key={certificate.id}
                >

                  <div className="card border shadow-sm h-100">

                    <div className="card-body">

                      {/* Certificate Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">

                        <div>

                          <h5 className="fw-bold mb-1">
                            {certificate.certificate_title}
                          </h5>

                          <p className="text-muted mb-0">
                            Certificate ID: {certificate.id}
                          </p>

                        </div>

                        <span className="badge bg-success">
                          Issued
                        </span>

                      </div>


                      <hr />


                      {/* Student Information */}
                      <div className="mb-3">

                        <p className="mb-2">
                          <strong>
                            Student ID:
                          </strong>{" "}
                          {certificate.student_id}
                        </p>

                        <p className="mb-2">
                          <strong>
                            Internship:
                          </strong>{" "}
                          {certificate.internship_title}
                        </p>

                        <p className="mb-2">
                          <strong>
                            Company:
                          </strong>{" "}
                          {certificate.company_name}
                        </p>

                        <p className="mb-2">
                          <strong>
                            Certificate Number:
                          </strong>{" "}
                          {certificate.certificate_number}
                        </p>

                        <p className="mb-2">
                          <strong>
                            Issue Date:
                          </strong>{" "}
                          {formatDate(
                            certificate.issue_date
                          )}
                        </p>

                        <p className="mb-0">
                          <strong>
                            Issued By:
                          </strong>{" "}
                          {certificate.issued_by}
                        </p>

                      </div>


                      {/* Internship Information */}
                      <div className="bg-light rounded p-3 mb-3">

                        <h6 className="fw-bold mb-2">
                          Internship Details
                        </h6>

                        <p className="mb-1">
                          <strong>
                            Location:
                          </strong>{" "}
                          {certificate.location ||
                            "Not specified"}
                        </p>

                        <p className="mb-1">
                          <strong>
                            Start Date:
                          </strong>{" "}
                          {formatDate(
                            certificate.start_date
                          )}
                        </p>

                        <p className="mb-0">
                          <strong>
                            End Date:
                          </strong>{" "}
                          {formatDate(
                            certificate.end_date
                          )}
                        </p>

                      </div>


                      {/* Buttons */}
                      <div className="d-flex gap-2">

                        <a
                          href={getCertificateUrl(
                            certificate
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary flex-fill"
                        >
                          View Certificate
                        </a>

                        <a
                          href={getCertificateUrl(
                            certificate
                          )}
                          download
                          className="btn btn-success flex-fill"
                        >
                          Download
                        </a>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

export default CollegeCertificates;