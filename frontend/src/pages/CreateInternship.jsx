import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CreateInternship() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    company_name: "",
    location: "",
    start_date: "",
    end_date: "",
  });

  const [loading, setLoading] = useState(false);

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

      setFormData((previousData) => ({
        ...previousData,
        company_name: userData.full_name || "",
      }));
    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      alert("Company information not found. Please login again.");
      navigate("/login");
      return;
    }

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.company_name.trim()
    ) {
      alert(
        "Please fill in the internship title, description, and company name."
      );
      return;
    }

    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      alert("End date cannot be before the start date.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/internships",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            company_name: formData.company_name.trim(),
            location: formData.location.trim() || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            created_by: user.user_id,
            status: "active",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to post internship."
        );
      }

      alert("Internship posted successfully!");

      navigate("/company/internships");
    } catch (error) {
      console.error("Post internship error:", error);

      alert(
        error.message ||
          "Something went wrong while posting the internship."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            Post Internship
          </h1>

          <p className="text-muted mb-0">
            Create a new internship opportunity for students.
          </p>
        </div>

        <Link
          to="/company/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label
                htmlFor="title"
                className="form-label fw-semibold"
              >
                Internship Title
              </label>

              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                placeholder="Example: Full Stack Developer Intern"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="description"
                className="form-label fw-semibold"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                className="form-control"
                rows="5"
                placeholder="Describe the internship, responsibilities, and requirements."
                value={formData.description}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <div className="mb-3">
              <label
                htmlFor="company_name"
                className="form-label fw-semibold"
              >
                Company Name
              </label>

              <input
                type="text"
                id="company_name"
                name="company_name"
                className="form-control"
                placeholder="Enter company name"
                value={formData.company_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="location"
                className="form-label fw-semibold"
              >
                Location
              </label>

              <input
                type="text"
                id="location"
                name="location"
                className="form-control"
                placeholder="Example: Ahmedabad / Remote"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label
                  htmlFor="start_date"
                  className="form-label fw-semibold"
                >
                  Start Date
                </label>

                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  className="form-control"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label
                  htmlFor="end_date"
                  className="form-label fw-semibold"
                >
                  End Date
                </label>

                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  className="form-control"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading
                  ? "Posting..."
                  : "Post Internship"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateInternship;
