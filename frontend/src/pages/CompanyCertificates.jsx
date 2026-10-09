import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyCertificates() {
  const navigate = useNavigate();

  const [user] = useState(() => { try { return JSON.parse(sessionStorage.getItem("user") || "null"); } catch { return null; } });
  const [students, setStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [certificateSearch, setCertificateSearch] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAcceptedStudents = async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem("user") || "{}").token || "";
      const response = await fetch("/api/company/workspace", { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Unable to load company records.");
      setStudents(data.interns); setCertificates(data.certificates || []);
      if (data.interns.length) setSelectedStudent(data.interns[0]);
    } catch (error) { setError(error.message || "Unable to load accepted interns."); }
    finally { setLoading(false); }
  };


  useEffect(() => {
    const storedUser =
      sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData =
        JSON.parse(storedUser);

      if (userData.role !== "company") {
        navigate("/login");
        return;
      }

      setTimeout(() => { void loadAcceptedStudents(); }, 0);
    } catch (error) {
      console.error(
        "Invalid user data:",
        error
      );

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);


  const downloadCertificate = async (row) => { try { const response = await fetch(`/api/certificates/file/${row.student_id}/${row.internship_id}`, { headers: { Authorization: `Bearer ${user?.token || ""}` } }); if (!response.ok) throw new Error("Unable to download certificate"); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `certificate_${row.student_id}_${row.internship_id}.pdf`; link.click(); URL.revokeObjectURL(url); } catch (error) { setError(error.message); } };

  const handleStudentSelect = (
    student
  ) => {
    setSelectedStudent(student);
    setSelectedFile(null);
    setMessage("");
    setError("");
  };

  const handleFileChange = (
    event
  ) => {
    const file =
      event.target.files[0];

    setMessage("");
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setSelectedFile(null);

      event.target.value = "";

      setError(
        "Only PDF files are allowed."
      );

      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedStudent) {
      setError(
        "Please select a student."
      );

      return;
    }

    if (!selectedFile) {
      setError(
        "Please select a PDF certificate."
      );

      return;
    }

    try {
      setUploading(true);

      const formData =
        new FormData();

      formData.append(
        "student_id",
        selectedStudent.student_id
      );

      formData.append(
        "internship_id",
        selectedStudent.internship_id
      );

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch(
          "/api/certificates/upload",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${user?.token || ""}` },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail ===
          "string"
            ? data.detail
            : JSON.stringify(
                data.detail ||
                  data
              );

        throw new Error(
          errorMessage ||
            "Unable to upload certificate."
        );
      }

      setMessage("Certificate PDF uploaded successfully.");
      await loadAcceptedStudents();

      setSelectedFile(null);

      const fileInput =
        document.getElementById(
          "certificateFile"
        );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error(
        "Certificate upload error:",
        error
      );

      setError(
        error.message ||
          "Unable to upload certificate."
      );
    } finally {
      setUploading(false);
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
            Certificates
          </h1>

          <p className="text-muted mb-0">
            Issue a certificate after every assigned task has been approved. The student and company can download it immediately; the college can download after approving the mentor evaluation.
          </p>
        </div>

        <Link
          to="/company/dashboard"
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

      {/* Success */}
      {message && (
        <div
          className="alert alert-success"
          role="alert"
        >
          {message}
        </div>
      )}

      {/* No accepted students */}
      {students.length === 0 ? (
        <div className="card shadow-sm">

          <div className="card-body text-center py-5">

            <div
              style={{
                fontSize: "48px",
                marginBottom: "15px",
              }}
            >
              📜
            </div>

            <h4 className="fw-bold mb-2">
              No Accepted Students Yet
            </h4>

            <p className="text-muted mb-0">
              You can upload certificates after accepting a student for an internship.
            </p>

          </div>

        </div>
      ) : (
        <div className="row g-4">

          {/* Students */}
          <div className="col-md-4">

            <div className="card shadow-sm">

              <div className="card-body">

                <h5 className="fw-bold mb-3">Accepted Students</h5>
                <input className="form-control mb-3" placeholder="Search accepted interns?" value={certificateSearch} onChange={(event) => setCertificateSearch(event.target.value)} />

                {students.filter((student) => [student.student_name,student.roll_number,student.college,student.internship_title].join(" ").toLowerCase().includes(certificateSearch.toLowerCase())).map(
                  (student) => (
                    <button
                      key={`${student.student_id}-${student.internship_id}`}
                      type="button"
                      className={`btn w-100 text-start mb-2 ${
                        selectedStudent &&
                        selectedStudent.student_id ===
                          student.student_id &&
                        selectedStudent.internship_id ===
                          student.internship_id
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() =>
                        handleStudentSelect(
                          student
                        )
                      }
                    >
                      <strong>
                        Student ID:{" "}
                        {
                          student.student_id
                        }
                      </strong>

                      <br />

                      <small>
                        {
                          student.internship_title
                        }
                        {student.certificate_eligible ? " · Ready to issue" : " · Tasks still need approval"}
                      </small>
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

          {/* Upload area */}
          <div className="col-md-8">

            <div className="card shadow-sm">

              <div className="card-body">

                {selectedStudent ? (
                  <>
                    <div className="mb-4">

                      <h4 className="fw-bold mb-1">
                        Student ID:{" "}
                        {
                          selectedStudent.student_id
                        }
                      </h4>

                      <p className="text-muted mb-1">
                        Internship:{" "}
                        <strong>
                          {
                            selectedStudent.internship_title
                          }
                        </strong>
                      </p>

                      <p className="text-muted mb-0">
                        Company:{" "}
                        <strong>
                          {
                            selectedStudent.internship_company
                          }
                        </strong>
                      </p>

                    </div>

                    <hr />

                    {!selectedStudent.certificate_eligible && <div className="alert alert-info">Approve all assigned tasks before issuing this certificate.</div>}

                    <form
                      onSubmit={
                        handleUpload
                      }
                    >

                      <div className="mb-3">

                        <label
                          htmlFor="certificateFile"
                          className="form-label fw-bold"
                        >
                          Upload Certificate PDF
                        </label>

                        <input
                          id="certificateFile"
                          type="file"
                          className="form-control"
                          accept=".pdf,application/pdf"
                          onChange={
                            handleFileChange
                          }
                          disabled={
                            uploading
                          }
                        />

                        <div className="form-text">
                          Only PDF certificate files are allowed.
                        </div>

                      </div>

                      {selectedFile && (
                        <div className="alert alert-secondary">

                          <strong>
                            Selected File:
                          </strong>{" "}
                          {
                            selectedFile.name
                          }

                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                          uploading ||
                          !selectedFile || !selectedStudent.certificate_eligible
                        }
                      >
                        {uploading
                          ? "Uploading..."
                          : "Upload Certificate"}
                      </button>

                    </form>
                  </>
                ) : (
                  <div className="text-center py-5">

                    <div
                      style={{
                        fontSize: "48px",
                      }}
                    >
                      📜
                    </div>

                    <h4 className="fw-bold mt-3">
                      Select a Student
                    </h4>

                    <p className="text-muted mb-0">
                      Select an accepted student to upload their certificate.
                    </p>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>
      )}
      <section className="card shadow-sm mt-4"><div className="card-body"><h4 className="fw-bold">Issued Certificates</h4>{certificates.length ? <div className="table-responsive"><table className="table"><thead><tr><th>Student</th><th>Internship</th><th>Certificate</th><th>Issued</th><th></th></tr></thead><tbody>{certificates.filter((row)=>[row.student_name,row.internship_title,row.certificate_number].join(" ").toLowerCase().includes(certificateSearch.toLowerCase())).map((row)=><tr key={row.id}><td>{row.student_name}</td><td>{row.internship_title}</td><td>{row.certificate_number}</td><td>{row.issue_date||"?"}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => downloadCertificate(row)}>Download</button></td></tr>)}</tbody></table></div>:<p className="text-muted mb-0">No certificates issued yet.</p>}</div></section>

    </div>
  );
}

export default CompanyCertificates;
