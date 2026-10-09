import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function CollegeProgress() {
  const [progressData, setProgressData] = useState([]);
  const [summary, setSummary] = useState({
    students: 0,
    internships: 0,
    totalTasks: 0,
    completedTasks: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all internships
      const internshipResponse = await fetch(
        "/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internships = await internshipResponse.json();

      const progressRows = [];

      let totalTasks = 0;
      let completedTasks = 0;

      // Process each internship
      for (const internship of internships) {
        try {
          // Get applications for this internship
          const applicationResponse = await fetch(
            `/api/applications/internship/${internship.id}`
          );

          if (!applicationResponse.ok) {
            continue;
          }

          const applications = await applicationResponse.json();

          // Only accepted students have active internship progress
          const acceptedApplications = applications.filter(
            (application) => application.status === "accepted"
          );

          for (const application of acceptedApplications) {
            try {
              // Get tasks assigned to the student
              const taskResponse = await fetch(
                `/api/tasks/student/${application.student_id}`,
                { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } }
              );

              if (!taskResponse.ok) {
                continue;
              }

              const allStudentTasks = await taskResponse.json();

              // Only use tasks belonging to this internship
              const internshipTasks = allStudentTasks.filter(
                (task) => task.internship_id === internship.id
              );

              const total = internshipTasks.length;

              const completed = internshipTasks.filter(
                (task) => task.status === "approved"
              ).length;

              const pending = total - completed;

              const progress =
                total > 0 ? Math.round((completed / total) * 100) : 0;

              totalTasks += total;
              completedTasks += completed;

              progressRows.push({
                student_id: application.student_id,
                internship_id: internship.id,
                internship_title: internship.title,
                company_name: internship.company_name,
                location: internship.location,
                start_date: internship.start_date,
                end_date: internship.end_date,
                total_tasks: total,
                completed_tasks: completed,
                pending_tasks: pending,
                progress: progress,
              });
            } catch (studentError) {
              console.error(
                `Unable to load tasks for student ${application.student_id}`,
                studentError
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

      // Remove duplicate student + internship records
      const uniqueRows = [];

      progressRows.forEach((row) => {
        const alreadyExists = uniqueRows.some(
          (item) =>
            item.student_id === row.student_id &&
            item.internship_id === row.internship_id
        );

        if (!alreadyExists) {
          uniqueRows.push(row);
        }
      });

      setProgressData(uniqueRows);

      const uniqueStudents = new Set(
        uniqueRows.map((row) => row.student_id)
      );

      const activeInternships = new Set(
        uniqueRows.map((row) => row.internship_id)
      );

      setSummary({
        students: uniqueStudents.size,
        internships: activeInternships.size,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load internship progress.");
    } finally {
      setLoading(false);
    }
  };

  const getProgressClass = (progress) => {
    if (progress === 100) {
      return "bg-success";
    }

    if (progress >= 50) {
      return "bg-info";
    }

    if (progress > 0) {
      return "bg-warning";
    }

    return "bg-secondary";
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not specified";
    }

    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary mb-3"></div>
        <h5>Loading Internship Progress...</h5>
      </div>
    );
  }

  return (
    <div className="container py-5">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">Internship Progress</h1>
          <p className="text-muted mb-0">
            Monitor student internship progress and task completion.
          </p>
        </div>

        <Link to="/college/dashboard" className="btn btn-primary">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-4 mb-4">

        {/* Students */}
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Students</h6>
              <h2 className="fw-bold text-primary">
                {summary.students}
              </h2>
              <p className="mb-0 text-muted">
                Students with active internships
              </p>
            </div>
          </div>
        </div>

        {/* Internships */}
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Active Internships</h6>
              <h2 className="fw-bold text-success">
                {summary.internships}
              </h2>
              <p className="mb-0 text-muted">
                Internships currently being monitored
              </p>
            </div>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Total Tasks</h6>
              <h2 className="fw-bold text-info">
                {summary.totalTasks}
              </h2>
              <p className="mb-0 text-muted">
                Tasks assigned to students
              </p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Completed Tasks</h6>
              <h2 className="fw-bold text-success">
                {summary.completedTasks}
              </h2>
              <p className="mb-0 text-muted">
                Tasks completed by students
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Progress Section */}
      <div className="card shadow-sm border-0">

        <div className="card-header bg-white py-3">
          <h4 className="fw-bold mb-1">
            Student Internship Progress
          </h4>

          <p className="text-muted mb-0">
            Progress is calculated from the tasks assigned by companies.
          </p>
        </div>

        <div className="card-body">

          {progressData.length === 0 ? (
            <div className="text-center py-5">
              <h4 className="fw-bold mb-2">
                No Internship Progress Yet
              </h4>

              <p className="text-muted mb-0">
                No accepted students with assigned tasks were found.
              </p>
            </div>
          ) : (
            <div className="row g-4">

              {progressData.map((item) => (
                <div
                  className="col-lg-6"
                  key={`${item.student_id}-${item.internship_id}`}
                >
                  <div className="card border shadow-sm h-100">

                    <div className="card-body">

                      {/* Student */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">
                            Student ID: {item.student_id}
                          </h5>

                          <p className="text-muted mb-0">
                            {item.internship_title}
                          </p>
                        </div>

                        <span className="badge bg-primary">
                          {item.progress}%
                        </span>
                      </div>

                      <hr />

                      {/* Internship Information */}
                      <div className="mb-3">

                        <p className="mb-2">
                          <strong>Company:</strong>{" "}
                          {item.company_name}
                        </p>

                        <p className="mb-2">
                          <strong>Location:</strong>{" "}
                          {item.location || "Not specified"}
                        </p>

                        <p className="mb-2">
                          <strong>Start Date:</strong>{" "}
                          {formatDate(item.start_date)}
                        </p>

                        <p className="mb-0">
                          <strong>End Date:</strong>{" "}
                          {formatDate(item.end_date)}
                        </p>

                      </div>

                      {/* Task Statistics */}
                      <div className="row text-center g-2 mb-3">

                        <div className="col-4">
                          <div className="bg-light rounded p-2">
                            <h5 className="fw-bold mb-0">
                              {item.total_tasks}
                            </h5>
                            <small className="text-muted">
                              Total
                            </small>
                          </div>
                        </div>

                        <div className="col-4">
                          <div className="bg-success bg-opacity-10 rounded p-2">
                            <h5 className="fw-bold text-success mb-0">
                              {item.completed_tasks}
                            </h5>
                            <small className="text-muted">
                              Completed
                            </small>
                          </div>
                        </div>

                        <div className="col-4">
                          <div className="bg-warning bg-opacity-10 rounded p-2">
                            <h5 className="fw-bold text-warning mb-0">
                              {item.pending_tasks}
                            </h5>
                            <small className="text-muted">
                              Pending
                            </small>
                          </div>
                        </div>

                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="fw-semibold">
                          Progress
                        </span>

                        <span className="fw-bold">
                          {item.progress}%
                        </span>
                      </div>

                      <div
                        className="progress"
                        style={{ height: "12px" }}
                      >
                        <div
                          className={`progress-bar ${getProgressClass(
                            item.progress
                          )}`}
                          role="progressbar"
                          style={{
                            width: `${item.progress}%`,
                          }}
                          aria-valuenow={item.progress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
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

export default CollegeProgress;

