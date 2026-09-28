import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminVerification() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user"));

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }

    loadVerificationData();
  }, [navigate]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      setError("");

      // USERS
      const usersResponse = await fetch(
        "http://127.0.0.1:8000/api/users"
      );

      if (!usersResponse.ok) {
        throw new Error("Unable to load users.");
      }

      const usersData = await usersResponse.json();

      // INTERNSHIPS
      const internshipsResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipsResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipsData = await internshipsResponse.json();

      // APPLICATIONS
      const applicationResults = await Promise.all(
        internshipsData.map(async (internship) => {
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
            );

            if (!response.ok) {
              return [];
            }

            const data = await response.json();

            return data.map((application) => ({
              ...application,
              internship_title: internship.title,
              company_name: internship.company_name,
              location: internship.location,
              start_date: internship.start_date,
              end_date: internship.end_date,
            }));
          } catch (err) {
            console.error(err);
            return [];
          }
        })
      );

      const allApplications = applicationResults.flat();

      // CERTIFICATES
      const acceptedApplications = allApplications.filter(
        (application) => application.status === "accepted"
      );

      const certificateResults = await Promise.all(
        acceptedApplications.map(async (application) => {
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/certificates/student/${application.student_id}`
            );

            if (!response.ok) {
              return [];
            }

            const data = await response.json();

            return data.filter(
              (certificate) =>
                certificate.internship_id === application.internship_id
            );
          } catch (err) {
            console.error(err);
            return [];
          }
        })
      );

      const allCertificates = certificateResults.flat();

      // Remove duplicate certificates
      const uniqueCertificates = Array.from(
        new Map(
          allCertificates.map((certificate) => [
            certificate.id,
            certificate,
          ])
        ).values()
      );

      setUsers(usersData);
      setInternships(internshipsData);
      setApplications(allApplications);
      setCertificates(uniqueCertificates);
      const companyResponse = await fetch("http://127.0.0.1:8000/api/admin/companies", { headers: { Authorization: `Bearer ${user?.token || ""}` } });
      if (companyResponse.ok) setCompanies(await companyResponse.json());
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Unable to load verification data."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyStatus = async (company, status) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/companies/${company.id}/verification?status=${status}`, {
        method: "PUT", headers: { Authorization: `Bearer ${user?.token || ""}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update company verification.");
      setCompanies((current) => current.map((item) => item.id === company.id ? { ...item, verification_status: status, verified_by: user.user_id, verified_at: new Date().toISOString() } : item));
    } catch (err) { setError(err.message); }
  };

  // APPLICATION COUNTS
  const totalApplications = applications.length;

  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted"
  );

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  );

  const rejectedApplications = applications.filter(
    (application) => application.status === "rejected"
  );

  // VERIFICATION COUNTS
  const verifiedRecords = acceptedApplications.filter(
    (application) =>
      certificates.some(
        (certificate) =>
          certificate.student_id === application.student_id &&
          certificate.internship_id === application.internship_id
      )
  );

  const certificatePendingRecords =
    acceptedApplications.filter(
      (application) =>
        !certificates.some(
          (certificate) =>
            certificate.student_id === application.student_id &&
            certificate.internship_id === application.internship_id
        )
    );

  const underReviewRecords = pendingApplications;

  const rejectedRecords = rejectedApplications;

  // COMPANY COUNT
  const totalCompanies = users.filter(
    (item) => item.role === "company"
  ).length;

  // STUDENT COUNT
  const totalStudents = users.filter(
    (item) => item.role === "student"
  ).length;

  // COLLEGE COUNT
  const totalColleges = users.filter(
    (item) => item.role === "college"
  ).length;

  const getVerificationStatus = (application) => {
    if (application.status === "rejected") {
      return "Not Verified";
    }

    if (application.status === "pending") {
      return "Under Review";
    }

    const hasCertificate = certificates.some(
      (certificate) =>
        certificate.student_id === application.student_id &&
        certificate.internship_id === application.internship_id
    );

    if (hasCertificate) {
      return "Verified";
    }

    return "Certificate Pending";
  };

  const getStatusBadge = (status) => {
    if (status === "Verified") {
      return "bg-success";
    }

    if (status === "Certificate Pending") {
      return "bg-warning text-dark";
    }

    if (status === "Under Review") {
      return "bg-info text-dark";
    }

    return "bg-danger";
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">

        <div className="spinner-border text-primary"></div>

        <p className="mt-3">
          Loading verification center...
        </p>

      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* =========================
          HEADER
      ========================== */}
      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Verification Center
          </h1>

          <p className="text-muted mb-0">
            Monitor student internship verification and certificate status.
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

      <div className="card border-0 shadow-sm mb-5"><div className="card-body"><h3 className="fw-bold mb-3">Company Verification</h3>{companies.length === 0 ? <p className="text-muted mb-0">No company accounts found.</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Company</th><th>Email</th><th>Status</th><th>Verification record</th><th>Actions</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td>{company.full_name}</td><td>{company.email}</td><td><span className={`badge ${company.verification_status === "verified" ? "bg-success" : company.verification_status === "rejected" ? "bg-danger" : "bg-warning text-dark"}`}>{company.verification_status}</span></td><td>{company.verified_by ? `Admin #${company.verified_by} · ${new Date(company.verified_at).toLocaleString()}` : "Not reviewed"}</td><td><button className="btn btn-sm btn-success me-2" onClick={() => updateCompanyStatus(company, "verified")}>Verify</button><button className="btn btn-sm btn-outline-danger" onClick={() => updateCompanyStatus(company, "rejected")}>Reject</button></td></tr>)}</tbody></table></div>}</div></div>

      {/* =========================
          PLATFORM SUMMARY
      ========================== */}
      <div className="row g-4 mb-5">

        {/* STUDENTS */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Students
              </h6>

              <h2 className="fw-bold text-primary">
                {totalStudents}
              </h2>

              <p className="text-muted mb-0">
                Registered students
              </p>

            </div>

          </div>
        </div>

        {/* COMPANIES */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Companies
              </h6>

              <h2 className="fw-bold text-info">
                {totalCompanies}
              </h2>

              <p className="text-muted mb-0">
                Registered companies
              </p>

            </div>

          </div>
        </div>

        {/* COLLEGES */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Colleges
              </h6>

              <h2 className="fw-bold text-warning">
                {totalColleges}
              </h2>

              <p className="text-muted mb-0">
                Registered colleges
              </p>

            </div>

          </div>
        </div>

        {/* INTERNSHIPS */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Internships
              </h6>

              <h2 className="fw-bold text-success">
                {internships.length}
              </h2>

              <p className="text-muted mb-0">
                Available internship records
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* =========================
          VERIFICATION SUMMARY
      ========================== */}
      <h3 className="fw-bold mb-3">
        Verification Summary
      </h3>

      <div className="row g-4 mb-5">

        {/* VERIFIED */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Verified
              </h6>

              <h2 className="fw-bold text-success">
                {verifiedRecords.length}
              </h2>

              <p className="text-muted mb-0">
                Internship records verified
              </p>

            </div>

          </div>
        </div>

        {/* CERTIFICATE PENDING */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Certificate Pending
              </h6>

              <h2 className="fw-bold text-warning">
                {certificatePendingRecords.length}
              </h2>

              <p className="text-muted mb-0">
                Accepted but no certificate
              </p>

            </div>

          </div>
        </div>

        {/* UNDER REVIEW */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Under Review
              </h6>

              <h2 className="fw-bold text-info">
                {underReviewRecords.length}
              </h2>

              <p className="text-muted mb-0">
                Pending applications
              </p>

            </div>

          </div>
        </div>

        {/* NOT VERIFIED */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Not Verified
              </h6>

              <h2 className="fw-bold text-danger">
                {rejectedRecords.length}
              </h2>

              <p className="text-muted mb-0">
                Rejected applications
              </p>

            </div>

          </div>
        </div>

      </div>

      {/* =========================
          VERIFICATION INFORMATION
      ========================== */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <h3 className="fw-bold mb-3">
            Verification Process
          </h3>

          <div className="row g-4">

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">

                <h5 className="fw-bold">
                  1. Application
                </h5>

                <p className="text-muted mb-0">
                  Student submits an internship application.
                </p>

              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">

                <h5 className="fw-bold">
                  2. Acceptance
                </h5>

                <p className="text-muted mb-0">
                  Company accepts the student's application.
                </p>

              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">

                <h5 className="fw-bold">
                  3. Certificate
                </h5>

                <p className="text-muted mb-0">
                  Company uploads the internship certificate.
                </p>

              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">

                <h5 className="fw-bold">
                  4. Verified
                </h5>

                <p className="text-muted mb-0">
                  Accepted application with certificate is shown as verified.
                </p>

              </div>
            </div>

          </div>

        </div>

      </div>

      {/* =========================
          VERIFICATION RECORDS
      ========================== */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <div>
              <h3 className="fw-bold mb-1">
                Verification Records
              </h3>

              <p className="text-muted mb-0">
                View the verification status of internship applications.
              </p>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={loadVerificationData}
            >
              🔄 Refresh
            </button>

          </div>

          {applications.length === 0 ? (

            <div className="alert alert-info mb-0">
              No application records available for verification.
            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">

                  <tr>
                    <th>Application ID</th>
                    <th>Student ID</th>
                    <th>Internship</th>
                    <th>Company</th>
                    <th>Application Status</th>
                    <th>Certificate</th>
                    <th>Verification</th>
                  </tr>

                </thead>

                <tbody>

                  {applications.map((application) => {

                    const verificationStatus =
                      getVerificationStatus(application);

                    const hasCertificate =
                      certificates.some(
                        (certificate) =>
                          certificate.student_id ===
                            application.student_id &&
                          certificate.internship_id ===
                            application.internship_id
                      );

                    return (
                      <tr key={application.id}>

                        {/* APPLICATION ID */}
                        <td>
                          <span className="badge bg-secondary">
                            {application.id}
                          </span>
                        </td>

                        {/* STUDENT ID */}
                        <td>
                          <span className="badge bg-primary">
                            {application.student_id}
                          </span>
                        </td>

                        {/* INTERNSHIP */}
                        <td>

                          <strong>
                            {application.internship_title}
                          </strong>

                          <br />

                          <small className="text-muted">
                            Internship ID: {application.internship_id}
                          </small>

                        </td>

                        {/* COMPANY */}
                        <td>
                          {application.company_name}
                        </td>

                        {/* APPLICATION STATUS */}
                        <td>

                          <span
                            className={`badge ${
                              application.status === "accepted"
                                ? "bg-success"
                                : application.status === "pending"
                                ? "bg-warning text-dark"
                                : "bg-danger"
                            }`}
                          >
                            {application.status}
                          </span>

                        </td>

                        {/* CERTIFICATE */}
                        <td>

                          {hasCertificate ? (

                            <span className="badge bg-success">
                              Available
                            </span>

                          ) : (

                            <span className="badge bg-secondary">
                              Not Available
                            </span>

                          )}

                        </td>

                        {/* VERIFICATION */}
                        <td>

                          <span
                            className={`badge ${getStatusBadge(
                              verificationStatus
                            )}`}
                          >
                            {verificationStatus}
                          </span>

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

      {/* =========================
          CERTIFICATE SUMMARY
      ========================== */}
      <div className="card border-0 shadow-sm mb-5">

        <div className="card-body">

          <h3 className="fw-bold mb-3">
            Certificate Verification
          </h3>

          <div className="row g-4">

            <div className="col-md-4">

              <div className="bg-light rounded p-4">

                <h6 className="text-muted">
                  Total Certificates
                </h6>

                <h2 className="fw-bold text-primary">
                  {certificates.length}
                </h2>

                <p className="text-muted mb-0">
                  Certificates available in the system
                </p>

              </div>

            </div>

            <div className="col-md-4">

              <div className="bg-light rounded p-4">

                <h6 className="text-muted">
                  Verified Records
                </h6>

                <h2 className="fw-bold text-success">
                  {verifiedRecords.length}
                </h2>

                <p className="text-muted mb-0">
                  Accepted applications with certificates
                </p>

              </div>

            </div>

            <div className="col-md-4">

              <div className="bg-light rounded p-4">

                <h6 className="text-muted">
                  Pending Certificates
                </h6>

                <h2 className="fw-bold text-warning">
                  {certificatePendingRecords.length}
                </h2>

                <p className="text-muted mb-0">
                  Accepted applications waiting for certificates
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* INFORMATION */}
      <div className="alert alert-light border">

        <strong>Verification Note:</strong>

        <span className="ms-2">
          A record is shown as verified when the student's application
          has been accepted and a certificate exists for the same internship.
        </span>

      </div>

    </div>
  );
}

export default AdminVerification;
