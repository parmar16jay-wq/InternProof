import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Certificate() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [certificates, setCertificates] = useState([]);
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

      if (userData.role !== "student") {
        navigate("/login");
        return;
      }

      setUser(userData);

      loadCertificates(userData.user_id);
    } catch (error) {
      console.error(
        "Invalid user data:",
        error
      );

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadCertificates = async (studentId) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `http://127.0.0.1:8000/api/certificates/student/${studentId}`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load certificates."
        );
      }

      const data = await response.json();

      setCertificates(data);
    } catch (error) {
      console.error(
        "Load certificates error:",
        error
      );

      setError(
        "Unable to load your certificates."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCertificateUrl = (
    certificate
  ) => {
    return (
      `http://127.0.0.1:8000/api/certificates/file/` +
      `${certificate.student_id}/` +
      `${certificate.internship_id}`
    );
  };

  const openCertificate = async (certificate, download = false) => {
    try {
      const response = await fetch(getCertificateUrl(certificate), { headers: { Authorization: `Bearer ${user?.token || ""}` } });
      if (!response.ok) throw new Error("Unable to open certificate PDF.");
      const url = URL.createObjectURL(await response.blob());
      if (download) { const link = document.createElement("a"); link.href = url; link.download = `certificate_${certificate.student_id}_${certificate.internship_id}.pdf`; link.click(); }
      else window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error.message); }
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
            Loading your certificates...
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
            Certificate
          </h1>

          <p className="text-muted mb-0">
            View and download your internship certificate.
          </p>
        </div>

        <Link
          to="/student/dashboard"
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

      {/* No certificates */}
      {certificates.length === 0 ? (
        <div className="card shadow-sm">

          <div className="card-body text-center py-5">

            <div
              style={{
                fontSize: "48px",
                marginBottom: "15px",
              }}
            >
              🏆
            </div>

            <h4 className="fw-bold mb-2">
              No Certificate Yet
            </h4>

            <p className="text-muted mb-0">
              Your certificate will appear here after your company uploads it.
            </p>

          </div>

        </div>
      ) : (
        <div className="row g-4">

          {certificates.map(
            (certificate) => {

              return (
                <div
                  className="col-md-6"
                  key={certificate.id}
                >

                  <div className="card shadow-sm h-100">

                    <div className="card-body p-4">

                      {/* Certificate icon */}
                      <div className="d-flex align-items-center mb-4">

                        <div
                          className="bg-warning text-dark rounded d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: "55px",
                            height: "55px",
                            fontSize: "25px",
                          }}
                        >
                          🏆
                        </div>

                        <div>
                          <h4 className="fw-bold mb-1">
                            Internship Certificate
                          </h4>

                          <p className="text-muted mb-0">
                            Certificate available
                          </p>
                        </div>

                      </div>

                      <hr />

                      {/* Certificate information */}
                      <div className="mb-3">

                        <p className="mb-2">
                          <strong>
                            Certificate Title:
                          </strong>{" "}
                          {certificate.certificate_title}
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
                          {certificate.issue_date}
                        </p>

                        <p className="mb-0">
                          <strong>
                            Issued By:
                          </strong>{" "}
                          {certificate.issued_by}
                        </p>

                      </div>

                      <hr />

                      {/* PDF buttons */}
                      <div className="d-flex gap-2 flex-wrap">

                        <button type="button" onClick={() => openCertificate(certificate)} className="btn btn-primary">
                          📄 View Certificate
                        </button>

                        <button type="button" onClick={() => openCertificate(certificate, true)} className="btn btn-outline-primary">
                          ⬇ Download PDF
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}

export default Certificate;