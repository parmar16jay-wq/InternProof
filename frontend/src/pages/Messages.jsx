import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Messages() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [acceptedInternship, setAcceptedInternship] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] =
    useState(false);
  const [sending, setSending] = useState(false);

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

      loadStudentInternship(userData.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const loadStudentInternship = async (studentId) => {
    try {
      setLoading(true);

      const [
        applicationsResponse,
        internshipsResponse,
      ] = await Promise.all([
        fetch(
          `http://127.0.0.1:8000/api/applications/student/${studentId}`
        ),
        fetch(
          "http://127.0.0.1:8000/api/internships"
        ),
      ]);

      if (!applicationsResponse.ok) {
        throw new Error(
          "Unable to load applications."
        );
      }

      if (!internshipsResponse.ok) {
        throw new Error(
          "Unable to load internships."
        );
      }

      const applications =
        await applicationsResponse.json();

      const internships =
        await internshipsResponse.json();

      /*
       * Find the accepted application.
       */
      const acceptedApplication =
        applications.find(
          (application) =>
            application.status === "accepted"
        );

      /*
       * If the student has not been accepted yet,
       * there is no internship communication.
       */
      if (!acceptedApplication) {
        setAcceptedInternship(null);
        setCompanyId(null);
        setMessages([]);
        return;
      }

      /*
       * Find the internship connected to the
       * accepted application.
       */
      const internship =
        internships.find(
          (item) =>
            item.id ===
            acceptedApplication.internship_id
        );

      if (!internship) {
        setAcceptedInternship(null);
        setCompanyId(null);
        setMessages([]);
        return;
      }

      setAcceptedInternship(internship);

      /*
       * created_by is the company user's ID.
       */
      setCompanyId(internship.created_by);

      /*
       * Load the conversation immediately.
       */
      await loadMessages(
        studentId,
        internship.created_by
      );
    } catch (error) {
      console.error(
        "Load student messages error:",
        error
      );

      setAcceptedInternship(null);
      setCompanyId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (
    studentId,
    companyUserId
  ) => {
    try {
      setMessagesLoading(true);

      const response = await fetch(
        `/api/messages/user/${studentId}`, { headers: { Authorization: `Bearer ${user?.token || ""}` } }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load messages."
        );
      }

      const data = await response.json();

      /*
       * Only show messages between:
       *
       * Student <-> Company
       */
      const conversation = data.filter(
        (message) =>
          (message.sender_id === studentId &&
            message.receiver_id ===
              companyUserId) ||
          (message.sender_id ===
            companyUserId &&
            message.receiver_id === studentId)
      );

      setMessages(conversation);

      /*
       * Mark company messages as read.
       */
      const unreadMessages =
        conversation.filter(
          (message) =>
            message.sender_id ===
              companyUserId &&
            message.receiver_id === studentId &&
            message.is_read === false
        );

      for (const message of unreadMessages) {
        try {
          await fetch(
            `/api/messages/${message.id}/read`,
            {
              method: "PUT", headers: { Authorization: `Bearer ${user?.token || ""}` },
            }
          );
        } catch (error) {
          console.error(
            "Unable to mark message as read:",
            error
          );
        }
      }
    } catch (error) {
      console.error(
        "Load messages error:",
        error
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  /*
   * Automatically check for new messages every
   * 3 seconds while the student is on this page.
   */
  useEffect(() => {
    if (
      !user ||
      !companyId ||
      !acceptedInternship
    ) {
      return;
    }

    const interval = setInterval(() => {
      loadMessages(
        user.user_id,
        companyId
      );
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [
    user,
    companyId,
    acceptedInternship,
  ]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!user || !companyId) {
      return;
    }

    if (!messageText.trim()) {
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        "/api/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token || ""}` },
          body: JSON.stringify({
            sender_id: user.user_id,
            receiver_id: companyId,
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

      /*
       * Immediately show the newly sent message.
       */
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
            Communicate important internship information with your company.
          </p>
        </div>

        <Link
          to="/student/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>

      </div>

      {/* No accepted internship */}
      {!acceptedInternship ? (
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
              You don't have any internship communication at the moment.
            </p>

          </div>

        </div>
      ) : (
        <div className="card shadow-sm">

          <div className="card-body">

            {/* Internship / Company Header */}
            <div className="mb-3">

              <h4 className="fw-bold mb-1">
                {acceptedInternship.title}
              </h4>

              <p className="text-muted mb-0">
                Company:{" "}
                <strong>
                  {acceptedInternship.company_name}
                </strong>
              </p>

            </div>

            <hr />

            {/* Chat Area */}
            <div
              className="border rounded p-3 mb-3"
              style={{
                height: "400px",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
              }}
            >

              {messagesLoading &&
              messages.length === 0 ? (
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
                    Start the conversation with your company.
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
              onSubmit={handleSendMessage}
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

          </div>

        </div>
      )}

    </div>
  );
}

export default Messages;