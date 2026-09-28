import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompanyMessages() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      if (userData.role !== "company") {
        navigate("/login");
        return;
      }

      setUser(userData);
      loadAcceptedStudents(userData.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadAcceptedStudents = async (companyId) => {
    try {
      setLoading(true);

      const internshipResponse = await fetch(
        "http://127.0.0.1:8000/api/internships"
      );

      if (!internshipResponse.ok) {
        throw new Error("Unable to load internships.");
      }

      const internshipData =
        await internshipResponse.json();

      const companyInternships =
        internshipData.filter(
          (internship) =>
            internship.created_by === companyId
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

          const applicationData =
            await applicationResponse.json();

          const acceptedApplications =
            applicationData.filter(
              (application) =>
                application.status === "accepted"
            );

          const studentsWithInternship =
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
              })
            );

          acceptedStudents = [
            ...acceptedStudents,
            ...studentsWithInternship,
          ];
        } catch (error) {
          console.error(
            `Unable to load applications for internship ${internship.id}:`,
            error
          );
        }
      }

      /*
       * Remove duplicate students.
       * A student may be accepted for more than one internship.
       * We keep one entry for each student.
       */
      const uniqueStudents = [];

      acceptedStudents.forEach((student) => {
        const alreadyExists =
          uniqueStudents.some(
            (item) =>
              item.student_id ===
              student.student_id
          );

        if (!alreadyExists) {
          uniqueStudents.push(student);
        }
      });

      setStudents(uniqueStudents);

      /*
       * Automatically select the first accepted student.
       */
      if (uniqueStudents.length > 0) {
        setSelectedStudent(uniqueStudents[0]);
        loadMessages(
          companyId,
          uniqueStudents[0].student_id
        );
      }
    } catch (error) {
      console.error(
        "Accepted students message error:",
        error
      );

      alert(
        "Unable to load accepted students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (
    companyId,
    studentId
  ) => {
    try {
      setMessagesLoading(true);

      const response = await fetch(
        `http://127.0.0.1:8000/api/messages/user/${companyId}`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load messages."
        );
      }

      const data = await response.json();

      /*
       * Only show messages between the company
       * and the selected accepted student.
       */
      const conversation = data.filter(
        (message) =>
          (message.sender_id === companyId &&
            message.receiver_id === studentId) ||
          (message.sender_id === studentId &&
            message.receiver_id === companyId)
      );

      setMessages(conversation);

      /*
       * Mark unread messages sent by the student
       * as read.
       */
      const unreadMessages =
        conversation.filter(
          (message) =>
            message.sender_id === studentId &&
            message.receiver_id === companyId &&
            message.is_read === false
        );

      for (const message of unreadMessages) {
        try {
          await fetch(
            `http://127.0.0.1:8000/api/messages/${message.id}/read`,
            {
              method: "PUT",
            }
          );
        } catch (error) {
          console.error(
            "Unable to mark message as read:",
            error
          );
        }
      }

      /*
       * Update local message state so unread
       * messages immediately appear as read.
       */
      if (unreadMessages.length > 0) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.sender_id === studentId &&
            message.receiver_id === companyId
              ? {
                  ...message,
                  is_read: true,
                }
              : message
          )
        );
      }
    } catch (error) {
      console.error(
        "Load messages error:",
        error
      );

      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);

    if (user) {
      loadMessages(
        user.user_id,
        student.student_id
      );
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!user || !selectedStudent) {
      return;
    }

    if (!messageText.trim()) {
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender_id: user.user_id,
            receiver_id:
              selectedStudent.student_id,
            message: messageText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail
            ? typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail)
            : "Unable to send message."
        );
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        data,
      ]);

      setMessageText("");
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      alert(
        error.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
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
            Loading messages...
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
            Messages / Communication
          </h1>

          <p className="text-muted mb-0">
            Communicate with students accepted for your internships.
          </p>
        </div>

        <Link
          to="/company/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">

            <div
              style={{
                fontSize: "48px",
                marginBottom: "15px",
              }}
            >
              💬
            </div>

            <h4 className="fw-bold mb-2">
              No Messages Yet
            </h4>

            <p className="text-muted mb-0">
              Messages will become available when you accept a student for an internship.
            </p>

          </div>
        </div>
      ) : (
        <div className="row g-4">

          {/* Student List */}
          <div className="col-md-4">

            <div className="card shadow-sm">

              <div className="card-body">

                <h5 className="fw-bold mb-3">
                  Accepted Students
                </h5>

                {students.map((student) => (
                  <button
                    key={student.student_id}
                    type="button"
                    className={`btn w-100 text-start mb-2 ${
                      selectedStudent &&
                      selectedStudent.student_id ===
                        student.student_id
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
                      {student.student_id}
                    </strong>

                    <br />

                    <small>
                      {student.internship_title}
                    </small>
                  </button>
                ))}

              </div>

            </div>

          </div>

          {/* Chat Section */}
          <div className="col-md-8">

            <div className="card shadow-sm">

              <div className="card-body">

                {selectedStudent ? (
                  <>
                    {/* Chat Header */}
                    <div className="mb-3">

                      <h4 className="fw-bold mb-1">
                        Student ID:{" "}
                        {selectedStudent.student_id}
                      </h4>

                      <p className="text-muted mb-0">
                        {selectedStudent.internship_title}
                      </p>

                    </div>

                    <hr />

                    {/* Messages */}
                    <div
                      className="border rounded p-3 mb-3"
                      style={{
                        height: "400px",
                        overflowY: "auto",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      {messagesLoading ? (
                        <div className="text-center py-5">

                          <div
                            className="spinner-border text-primary"
                            role="status"
                          >
                            <span className="visually-hidden">
                              Loading...
                            </span>
                          </div>

                          <p className="text-muted mt-3">
                            Loading conversation...
                          </p>

                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-5">

                          <div
                            style={{
                              fontSize: "40px",
                            }}
                          >
                            💬
                          </div>

                          <h5 className="fw-bold mt-3">
                            No Messages Yet
                          </h5>

                          <p className="text-muted mb-0">
                            Start the conversation with this student.
                          </p>

                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`d-flex mb-3 ${
                              message.sender_id ===
                              user.user_id
                                ? "justify-content-end"
                                : "justify-content-start"
                            }`}
                          >
                            <div
                              className={`p-3 rounded ${
                                message.sender_id ===
                                user.user_id
                                  ? "bg-primary text-white"
                                  : "bg-white border"
                              }`}
                              style={{
                                maxWidth: "75%",
                              }}
                            >

                              <div>
                                {message.message}
                              </div>

                              {message.sent_at && (
                                <small
                                  className={
                                    message.sender_id ===
                                    user.user_id
                                      ? "text-white-50"
                                      : "text-muted"
                                  }
                                >
                                  {new Date(
                                    message.sent_at
                                  ).toLocaleString()}
                                </small>
                              )}

                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Send Message */}
                    <form
                      onSubmit={
                        handleSendMessage
                      }
                    >
                      <div className="input-group">

                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(event) =>
                            setMessageText(
                              event.target.value
                            )
                          }
                          disabled={sending}
                        />

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={
                            sending ||
                            !messageText.trim()
                          }
                        >
                          {sending
                            ? "Sending..."
                            : "Send"}
                        </button>

                      </div>
                    </form>

                  </>
                ) : (
                  <div className="text-center py-5">

                    <div
                      style={{
                        fontSize: "48px",
                      }}
                    >
                      💬
                    </div>

                    <h4 className="fw-bold mt-3">
                      Select a Student
                    </h4>

                    <p className="text-muted mb-0">
                      Select an accepted student to start a conversation.
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

export default CompanyMessages;