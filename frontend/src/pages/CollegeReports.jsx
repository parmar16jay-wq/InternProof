import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function CollegeReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [summary, setSummary] = useState({
    students: 0,
    internships: 0,
    activeInternships: 0,
    applications: 0,
    accepted: 0,
    pending: 0,
    rejected: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    certificates: 0,
  });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (!userData) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(userData);

      if (user.role !== "college") {
        window.location.href = "/login";
        return;
      }

      loadReports();
    } catch (err) {
      console.error(err);
      window.location.href = "/login";
    }
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // 1. GET STUDENTS
      // =====================================================

      let studentData = [];

      try {
        const studentResponse = await fetch(
          "/api/users"
        );

        if (studentResponse.ok) {
          const data = await studentResponse.json();

          studentData = Array.isArray(data)
            ? data.filter((user) => user.role === "student")
            : [];
        }
      } catch (studentError) {
        console.error("Unable to load students:", studentError);
      }

      setStudents(studentData);


      // =====================================================
      // 2. GET INTERNSHIPS
      // =====================================================

      const internshipResponse = await fetch(
        "/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData = await internshipResponse.json();

      setInternships(internshipData);


      // =====================================================
      // 3. GET APPLICATIONS
      // =====================================================

      const allApplications = [];

      for (const internship of internshipData) {
        try {
          const applicationResponse = await fetch(
            `/api/applications/internship/${internship.id}`
          );

          if (!applicationResponse.ok) {
            continue;
          }

          const internshipApplications =
            await applicationResponse.json();

          internshipApplications.forEach((application) => {
            allApplications.push({
              ...application,
              internship_title: internship.title,
              company_name: internship.company_name,
            });
          });
        } catch (applicationError) {
          console.error(
            `Unable to load applications for internship ${internship.id}`,
            applicationError
          );
        }
      }

      // Remove duplicate applications
      const uniqueApplications = [];

      allApplications.forEach((application) => {
        const exists = uniqueApplications.some(
          (item) => item.id === application.id
        );

        if (!exists) {
          uniqueApplications.push(application);
        }
      });

      setApplications(uniqueApplications);


      // =====================================================
      // 4. GET TASKS
      // =====================================================

      const allTasks = [];

      const studentIds = [
        ...new Set(
          uniqueApplications
            .filter(
              (application) =>
                application.status === "accepted"
            )
            .map(
              (application) => application.student_id
            )
        ),
      ];

      for (const studentId of studentIds) {
        try {
          const taskResponse = await fetch(
            `/api/tasks/student/${studentId}`,
            { headers: { Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` } }
          );

          if (!taskResponse.ok) {
            continue;
          }

          const studentTasks = await taskResponse.json();

          studentTasks.forEach((task) => {
            const exists = allTasks.some(
              (item) => item.id === task.id
            );

            if (!exists) {
              allTasks.push(task);
            }
          });
        } catch (taskError) {
          console.error(
            `Unable to load tasks for student ${studentId}`,
            taskError
          );
        }
      }

      setTasks(allTasks);


      // =====================================================
      // 5. GET CERTIFICATES
      // =====================================================

      const allCertificates = [];

      for (const studentId of studentIds) {
        try {
          const certificateResponse = await fetch(
            `/api/certificates/student/${studentId}`
          );

          if (!certificateResponse.ok) {
            continue;
          }

          const studentCertificates =
            await certificateResponse.json();

          studentCertificates.forEach((certificate) => {
            const exists = allCertificates.some(
              (item) => item.id === certificate.id
            );

            if (!exists) {
              allCertificates.push(certificate);
            }
          });
        } catch (certificateError) {
          console.error(
            `Unable to load certificates for student ${studentId}`,
            certificateError
          );
        }
      }

      setCertificates(allCertificates);


      // =====================================================
      // 6. CALCULATE REPORT
      // =====================================================

      const totalApplications =
        uniqueApplications.length;

      const acceptedApplications =
        uniqueApplications.filter(
          (application) =>
            application.status === "accepted"
        ).length;

      const pendingApplications =
        uniqueApplications.filter(
          (application) =>
            application.status === "pending"
        ).length;

      const rejectedApplications =
        uniqueApplications.filter(
          (application) =>
            application.status === "rejected"
        ).length;

      const totalTasks = allTasks.length;

      const completedTasks =
        allTasks.filter(
          (task) => task.status === "approved"
        ).length;

      const pendingTasks =
        allTasks.filter(
          (task) => task.status === "pending"
        ).length;

      const activeInternships =
        internshipData.filter(
          (internship) =>
            internship.status === "active"
        ).length;

      setSummary({
        students: studentData.length,
        internships: internshipData.length,
        activeInternships: activeInternships,
        applications: totalApplications,
        accepted: acceptedApplications,
        pending: pendingApplications,
        rejected: rejectedApplications,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        pendingTasks: pendingTasks,
        certificates: allCertificates.length,
      });

    } catch (err) {
      console.error(err);

      setError(
        err.message || "Unable to generate report."
      );
    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // CALCULATIONS
  // =====================================================

  const applicationAcceptanceRate =
    summary.applications > 0
      ? Math.round(
          (summary.accepted /
            summary.applications) *
            100
        )
      : 0;

  const taskCompletionRate =
    summary.totalTasks > 0
      ? Math.round(
          (summary.completedTasks /
            summary.totalTasks) *
            100
        )
      : 0;


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="container py-5 text-center">

        <div className="spinner-border text-primary mb-3"></div>

        <h5>
          Generating College Report...
        </h5>

      </div>
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="container py-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>

          <h1 className="fw-bold mb-2">
            College Reports
          </h1>

          <p className="text-muted mb-0">
            View overall internship management statistics.
          </p>

        </div>

        <Link
          to="/college/dashboard"
          className="btn btn-primary"
        >
          â† Back to Dashboard
        </Link>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}


      {/* =================================================
          MAIN SUMMARY
      ================================================= */}

      <div className="row g-4 mb-4">

        {/* Students */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Students
              </h6>

              <h2 className="fw-bold text-primary">
                {summary.students}
              </h2>

              <p className="text-muted mb-0">
                Registered students
              </p>

            </div>

          </div>

        </div>


        {/* Internships */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Internships
              </h6>

              <h2 className="fw-bold text-success">
                {summary.internships}
              </h2>

              <p className="text-muted mb-0">
                {summary.activeInternships} active internships
              </p>

            </div>

          </div>

        </div>


        {/* Applications */}

        <div className="col-md-4">

          <div className="card shadow-sm border-0 h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Applications
              </h6>

              <h2 className="fw-bold text-info">
                {summary.applications}
              </h2>

              <p className="text-muted mb-0">
                Student internship applications
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          APPLICATION REPORT
      ================================================= */}

      <div className="card shadow-sm border-0 mb-4">

        <div className="card-header bg-white py-3">

          <h4 className="fw-bold mb-1">
            Application Report
          </h4>

          <p className="text-muted mb-0">
            Overview of student internship applications.
          </p>

        </div>

        <div className="card-body">

          <div className="row g-4">

            {/* Total */}

            <div className="col-md-3">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold">
                  {summary.applications}
                </h3>

                <p className="text-muted mb-0">
                  Total
                </p>

              </div>

            </div>


            {/* Accepted */}

            <div className="col-md-3">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-success">
                  {summary.accepted}
                </h3>

                <p className="text-muted mb-0">
                  Accepted
                </p>

              </div>

            </div>


            {/* Pending */}

            <div className="col-md-3">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-warning">
                  {summary.pending}
                </h3>

                <p className="text-muted mb-0">
                  Pending
                </p>

              </div>

            </div>


            {/* Rejected */}

            <div className="col-md-3">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-danger">
                  {summary.rejected}
                </h3>

                <p className="text-muted mb-0">
                  Rejected
                </p>

              </div>

            </div>

          </div>


          {/* Acceptance Rate */}

          <div className="mt-4">

            <div className="d-flex justify-content-between mb-2">

              <span className="fw-semibold">
                Application Acceptance Rate
              </span>

              <span className="fw-bold">
                {applicationAcceptanceRate}%
              </span>

            </div>

            <div
              className="progress"
              style={{ height: "12px" }}
            >

              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{
                  width: `${applicationAcceptanceRate}%`,
                }}
              ></div>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          TASK REPORT
      ================================================= */}

      <div className="card shadow-sm border-0 mb-4">

        <div className="card-header bg-white py-3">

          <h4 className="fw-bold mb-1">
            Task Completion Report
          </h4>

          <p className="text-muted mb-0">
            Overview of student internship tasks.
          </p>

        </div>

        <div className="card-body">

          <div className="row g-4">

            {/* Total Tasks */}

            <div className="col-md-4">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-info">
                  {summary.totalTasks}
                </h3>

                <p className="text-muted mb-0">
                  Total Tasks
                </p>

              </div>

            </div>


            {/* Completed */}

            <div className="col-md-4">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-success">
                  {summary.completedTasks}
                </h3>

                <p className="text-muted mb-0">
                  Completed
                </p>

              </div>

            </div>


            {/* Pending */}

            <div className="col-md-4">

              <div className="border rounded p-3 text-center">

                <h3 className="fw-bold text-warning">
                  {summary.pendingTasks}
                </h3>

                <p className="text-muted mb-0">
                  Pending
                </p>

              </div>

            </div>

          </div>


          {/* Completion Rate */}

          <div className="mt-4">

            <div className="d-flex justify-content-between mb-2">

              <span className="fw-semibold">
                Overall Task Completion
              </span>

              <span className="fw-bold">
                {taskCompletionRate}%
              </span>

            </div>

            <div
              className="progress"
              style={{ height: "12px" }}
            >

              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{
                  width: `${taskCompletionRate}%`,
                }}
              ></div>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          CERTIFICATE REPORT
      ================================================= */}

      <div className="card shadow-sm border-0 mb-4">

        <div className="card-header bg-white py-3">

          <h4 className="fw-bold mb-1">
            Certificate Report
          </h4>

          <p className="text-muted mb-0">
            Overview of certificates issued to students.
          </p>

        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-4">

              <div className="border rounded p-4 text-center">

                <h2 className="fw-bold text-primary">
                  {summary.certificates}
                </h2>

                <p className="text-muted mb-0">
                  Certificates Issued
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          INTERNSHIP SUMMARY
      ================================================= */}

      <div className="card shadow-sm border-0">

        <div className="card-header bg-white py-3">

          <h4 className="fw-bold mb-1">
            Internship Summary
          </h4>

          <p className="text-muted mb-0">
            Internship-wise information.
          </p>

        </div>


        <div className="card-body">

          {internships.length === 0 ? (

            <div className="text-center py-4">

              <h5 className="fw-bold">
                No Internships Found
              </h5>

              <p className="text-muted mb-0">
                There are currently no internships in the system.
              </p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-bordered align-middle">

                <thead className="table-light">

                  <tr>

                    <th>
                      Internship
                    </th>

                    <th>
                      Company
                    </th>

                    <th>
                      Applications
                    </th>

                    <th>
                      Accepted
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {internships.map((internship) => {

                    const internshipApplications =
                      applications.filter(
                        (application) =>
                          application.internship_id ===
                          internship.id
                      );

                    const accepted =
                      internshipApplications.filter(
                        (application) =>
                          application.status ===
                          "accepted"
                      ).length;

                    return (

                      <tr key={internship.id}>

                        <td>
                          <strong>
                            {internship.title}
                          </strong>
                        </td>

                        <td>
                          {internship.company_name}
                        </td>

                        <td>
                          {internshipApplications.length}
                        </td>

                        <td>
                          <span className="badge bg-success">
                            {accepted}
                          </span>
                        </td>

                        <td>

                          <span
                            className={`badge ${
                              internship.status ===
                              "active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {internship.status}
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

    </div>
  );
}

export default CollegeReports;

