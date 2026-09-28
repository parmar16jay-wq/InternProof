import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function StudentProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  // Load user information
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    // No user is logged in
    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      // Only students can access this page
      if (parsedUser.role !== "student") {
        navigate("/login");
        return;
      }

      setUser(parsedUser);

      // Load saved profile photo
      const savedPhoto = localStorage.getItem(
        `profilePhoto_${parsedUser.user_id}`
      );

      // Load saved mobile number
      const savedMobile = localStorage.getItem(
        `mobile_${parsedUser.user_id}`
      );

      // Load saved location
      const savedLocation = localStorage.getItem(
        `location_${parsedUser.user_id}`
      );

      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }

      if (savedMobile) {
        setMobile(savedMobile);
      }

      if (savedLocation) {
        setLocation(savedLocation);
      }

    } catch (error) {
      console.error("Invalid user data:", error);

      sessionStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);


  // Upload profile photo
  const handlePhotoChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Check if selected file is an image
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    // Maximum file size: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must be less than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfilePhoto(reader.result);
      setMessage("");
    };

    reader.readAsDataURL(file);
  };


  // Save profile changes
  const handleSave = () => {
    if (!user) {
      return;
    }

    // Save profile photo
    localStorage.setItem(
      `profilePhoto_${user.user_id}`,
      profilePhoto
    );

    // Save mobile number
    localStorage.setItem(
      `mobile_${user.user_id}`,
      mobile
    );

    // Save location
    localStorage.setItem(
      `location_${user.user_id}`,
      location
    );

    setMessage("Profile updated successfully.");
  };


  // Wait until user information loads
  if (!user) {
    return null;
  }


  return (
    <div className="container py-5">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h1 className="fw-bold mb-1">
            My Profile
          </h1>

          <p className="text-muted mb-0">
            Manage your InternProof profile
          </p>
        </div>


        {/* Back Button Only */}
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate("/student")}
        >
          Back to Dashboard
        </button>

      </div>


      {/* Success / Error Message */}
      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}


      <div className="row g-4">

        {/* Left Profile Card */}
        <div className="col-md-4">

          <div className="card shadow-sm h-100">

            <div className="card-body text-center p-4">

              {/* Profile Photo */}
              <div
                className="mx-auto mb-3"
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "4px solid #5B5CFF",
                  backgroundColor: "var(--background)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >

                {profilePhoto ? (

                  <img
                    src={profilePhoto}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                ) : (

                  <span
                    className="text-muted"
                    style={{
                      fontSize: "55px",
                    }}
                  >
                    👤
                  </span>

                )}

              </div>


              {/* Student Name */}
              <h4 className="fw-bold mb-1">
                {user.full_name}
              </h4>


              {/* Email */}
              <p className="text-muted mb-3">
                {user.email}
              </p>


              {/* Student Badge */}
              <span className="badge bg-primary px-3 py-2">
                Student
              </span>


              {/* Upload Photo */}
              <div className="mt-4">

                <label
                  htmlFor="profilePhoto"
                  className="btn btn-primary"
                >
                  📷 {profilePhoto ? "Change Photo" : "Upload Photo"}
                </label>

                <input
                  id="profilePhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />

              </div>


              <p className="text-muted small mt-2 mb-0">
                JPG, PNG or other image formats
                <br />
                Maximum size: 5 MB
              </p>

            </div>

          </div>

        </div>


        {/* Right Profile Information */}
        <div className="col-md-8">

          <div className="card shadow-sm">

            <div className="card-body p-4">

              <h4 className="fw-bold mb-4">
                Personal Information
              </h4>


              {/* Full Name */}
              <div className="mb-3">

                <label className="form-label fw-semibold">
                  Full Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={user.full_name}
                  readOnly
                />

              </div>


              {/* Email */}
              <div className="mb-3">

                <label className="form-label fw-semibold">
                  Email Address
                </label>

                <input
                  type="email"
                  className="form-control"
                  value={user.email}
                  readOnly
                />

              </div>


              {/* Mobile Number */}
              <div className="mb-3">

                <label className="form-label fw-semibold">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  className="form-control"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                />

              </div>


              {/* Location */}
              <div className="mb-3">

                <label className="form-label fw-semibold">
                  Location
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your city / location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />

              </div>


              {/* Account Type */}
              <div className="mb-3">

                <label className="form-label fw-semibold">
                  Account Type
                </label>

                <input
                  type="text"
                  className="form-control text-capitalize"
                  value={user.role}
                  readOnly
                />

              </div>


              {/* User ID */}
              <div className="mb-4">

                <label className="form-label fw-semibold">
                  User ID
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={user.user_id}
                  readOnly
                />

              </div>


              {/* Save Button */}
              <button
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>

      </div>


      {/* Profile Information */}
      <div className="card shadow-sm mt-4">

        <div className="card-body">

          <h5 className="fw-bold mb-2">
            InternProof Profile
          </h5>

          <p className="text-muted mb-0">
            Keep your profile information updated.
            Your profile will be used throughout your
            internship journey on InternProof.
          </p>

        </div>

      </div>

    </div>
  );
}

export default StudentProfile;