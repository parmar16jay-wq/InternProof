import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminCertificates() {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // LOAD CERTIFICATES
  // =========================
  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError("");

      const usersResponse = await fetch(
        "http://127.0.0.1:8000/api/users"
      );

      const internshipsResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!usersResponse.ok) {
        throw new Error("Unable to load users.");
      }

      if (!internshipsResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const users = await usersResponse.json();
      const internships = await internshipsResponse.json();

      // Get all students
      const students = users.filter(
        (user) => user.role === "student"
      );

      let allCertificates = [];

      // Get certificates for every student
      for (const student of students) {
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/certificates/student/${student.id}`
          );

          if (!response.ok) {
            continue;
          }

          const studentCertificates = await response.json();

          const certificatesWithDetails = studentCertificates.map(
            (certificate) => {
              const internship = internships.find(
                (item) => item.id === certificate.internship_id
              );

              return {
                ...certificate,

                student_name:
                  student.full_name || "Unknown Student",

                student_email:
                  student.email || "No Email",

                internship_title:
                  internship?.title || "Unknown Internship",

                company_name:
                  internship?.company_name ||
                  certificate.issued_by ||
                  "Unknown Company",
              };
            }
          );

          allCertificates = [
            ...allCertificates,
            ...certificatesWithDetails,
          ];
        } catch (studentError) {
          console.error(
            `Error loading certificates for student ${student.id}:`,
            studentError
          );
        }
      }

      setCertificates(allCertificates);
    } catch (err) {
      console.error("Certificate loading error:", err);
      setError(err.message || "Unable to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // AUTH CHECK
  // =========================
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

      loadCertificates();
    } catch (error) {
      console.error("Invalid user session:", error);
      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // =========================
  // CERTIFICATE FILE URL
  // =========================
  const getCertificateUrl = (certificate) => {
    return `http://127.0.0.1:8000/api/certificates/file/${certificate.student_id}/${certificate.internship_id}`;
  };

  // =========================
  // VIEW CERTIFICATE
  // =========================
  const viewCertificate = (certificate) => {
    const url = getCertificateUrl(certificate);
    window.open(url, "_blank");
  };

  // =========================
  // DOWNLOAD CERTIFICATE
  // =========================
  const downloadCertificate = async (certificate) => {
    try {
      const url = getCertificateUrl(certificate);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Unable to download certificate.");
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;

      link.download =
        `certificate_${certificate.student_id}_${certificate.internship_id}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Unable to download certificate.");
    }
  };

  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "N/A";
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString();
  };

  // =========================
  // SUMMARY DATA
  // =========================
  const totalCertificates = certificates.length;

  const totalStudents = new Set(
    certificates.map((certificate) => certificate.student_id)
  ).size;

  const totalInternships = new Set(
    certificates.map((certificate) => certificate.internship_id)
  ).size;

  // =========================
  // LOADING SCREEN
  // =========================
  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div
            className="spinner-border text-primary"
            role="status"
          ></div>

          <p className="mt-3 text-muted">
            Loading certificate records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* =========================
          PAGE HEADER
      ========================= */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            📜 Certificate Management
          </h1>

          <p className="text-muted mb-0">
            View and manage certificates available in the system.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={loadCertificates}
          >
            🔄 Refresh
          </button>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* =========================
          ERROR MESSAGE
      ========================= */}
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* =========================
          SUMMARY CARDS
      ========================= */}
      <div className="row g-4 mb-5">

        {/* TOTAL CERTIFICATES */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">
                    Total Certificates
                  </h6>

                  <h2 className="fw-bold mb-0">
                    {totalCertificates}
                  </h2>
                </div>

                <div className="fs-1">
                  📜
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STUDENTS */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">
                    Students
                  </h6>

                  <h2 className="fw-bold mb-0">
                    {totalStudents}
                  </h2>
                </div>

                <div className="fs-1">
                  👨‍🎓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTERNSHIPS */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">
                    Internships
                  </h6>

                  <h2 className="fw-bold mb-0">
                    {totalInternships}
                  </h2>
                </div>

                <div className="fs-1">
                  💼
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================
          CERTIFICATE DIRECTORY
      ========================= */}
      <div className="card shadow-sm border-0">

        <div className="card-body">

          <div className="mb-4">
            <h2 className="fw-bold mb-1">
              Certificate Directory
            </h2>

            <p className="text-muted mb-0">
              View all certificates available in the system.
            </p>
          </div>

          {/* NO CERTIFICATES */}
          {certificates.length === 0 ? (
            <div className="text-center py-5">
              <div className="fs-1 mb-3">
                📜
              </div>

              <h5 className="fw-bold">
                No Certificates Found
              </h5>

              <p className="text-muted">
                There are currently no certificates available
                in the system.
              </p>
            </div>
          ) : (
            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">

                  <tr>
                    <th>Certificate ID</th>
                    <th>Student</th>
                    <th>Internship</th>
                    <th>Company</th>
                    <th>Certificate Number</th>
                    <th>Issue Date</th>
                    <th>Issued By</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {certificates.map((certificate) => (

                    <tr key={certificate.id}>

                      {/* CERTIFICATE ID */}
                      <td>
                        <span className="badge bg-secondary">
                          {certificate.id}
                        </span>
                      </td>

                      {/* STUDENT */}
                      <td>
                        <div>
                          <strong>
                            {certificate.student_name}
                          </strong>

                          <div className="small text-muted">
                            ID: {certificate.student_id}
                          </div>

                          <div className="small text-muted">
                            {certificate.student_email}
                          </div>
                        </div>
                      </td>

                      {/* INTERNSHIP */}
                      <td>
                        <div>
                          <strong>
                            {certificate.internship_title}
                          </strong>

                          <div className="small text-muted">
                            ID: {certificate.internship_id}
                          </div>
                        </div>
                      </td>

                      {/* COMPANY */}
                      <td>
                        {certificate.company_name}
                      </td>

                      {/* CERTIFICATE NUMBER */}
                      <td>
                        {certificate.certificate_number || "N/A"}
                      </td>

                      {/* ISSUE DATE */}
                      <td>
                        {formatDate(certificate.issue_date)}
                      </td>

                      {/* ISSUED BY */}
                      <td>
                        {certificate.issued_by || "N/A"}
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div className="d-flex gap-2">

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              viewCertificate(certificate)
                            }
                          >
                            📄 View
                          </button>

                          <button
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              downloadCertificate(certificate)
                            }
                          >
                            ⬇ Download
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default AdminCertificates;