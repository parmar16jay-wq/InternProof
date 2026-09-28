import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyCertificates() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      setUser(userData);

      loadAcceptedStudents(
        userData.user_id
      );
    } catch (error) {
      console.error(
        "Invalid user data:",
        error
      );

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadAcceptedStudents = async (
    companyId
  ) => {
    try {
      setLoading(true);
      setError("");

      const internshipResponse =
        await fetch(
          "http://127.0.0.1:8000/api/internships"
        );

      if (!internshipResponse.ok) {
        throw new Error(
          "Unable to load internships."
        );
      }

      const internships =
        await internshipResponse.json();

      const companyInternships =
        internships.filter(
          (internship) =>
            internship.created_by ===
            companyId
        );

      let acceptedStudents = [];

      for (const internship of companyInternships) {
        try {
          const applicationResponse =
            await fetch(
              `http://127.0.0.1:8000/api/applications/internship/${internship.id}`
            );

          if (!applicationResponse.ok) {
            continue;
          }

          const applications =
            await applicationResponse.json();

          const acceptedApplications =
            applications.filter(
              (application) =>
                application.status ===
                "accepted"
            );

          const students =
            acceptedApplications.map(
              (application) => ({
                student_id:
                  application.student_id,

                application_id:
                  application.id,

                internship_id:
                  internship.id,

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

                applied_at:
                  application.applied_at,
              })
            );

          acceptedStudents = [
            ...acceptedStudents,
            ...students,
          ];
        } catch (error) {
          console.error(
            `Unable to load applications for internship ${internship.id}:`,
            error
          );
        }
      }

      setStudents(
        acceptedStudents
      );

      if (acceptedStudents.length > 0) {
        setSelectedStudent(
          acceptedStudents[0]
        );
      }
    } catch (error) {
      console.error(
        "Load accepted students error:",
        error
      );

      setError(
        "Unable to load accepted students."
      );
    } finally {
      setLoading(false);
    }
  };

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
          "http://127.0.0.1:8000/api/certificates/upload",
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

      setMessage(
        "Certificate PDF uploaded successfully."
      );

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
            Upload PDF certificates for accepted students.
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

                <h5 className="fw-bold mb-3">
                  Accepted Students
                </h5>

                {students.map(
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
                          !selectedFile
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

    </div>
  );
}

export default CompanyCertificates;
