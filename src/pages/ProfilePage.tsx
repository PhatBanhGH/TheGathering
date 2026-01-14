import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { formatDate, formatRelativeTime } from "../utils/date";
import { getAvatarColor } from "../utils/avatar";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSocket();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "events" | "resources">(
    "posts"
  );
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [userResources, setUserResources] = useState<any[]>([]);

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
  const isOwnProfile = currentUser?.userId === userId;

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (profileUser) {
      fetchUserContent();
    }
  }, [profileUser, activeTab]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${serverUrl}/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setProfileUser(data);
      } else if (response.status === 404) {
        navigate("/app");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserContent = async () => {
    if (!profileUser) return;

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch user's posts
      if (activeTab === "posts") {
        // Posts functionality removed
        setUserPosts([]);
      }
    } catch (error) {
      console.error("Error fetching user content:", error);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-page">
        <div className="profile-error">User not found</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="profile-cover">
          <div
            className="profile-avatar-large"
            style={{ backgroundColor: getAvatarColor(profileUser._id) }}
          >
            {profileUser.username?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{profileUser.username}</h1>
          {profileUser.email && (
            <p className="profile-email">{profileUser.email}</p>
          )}
          {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
          <div className="profile-meta">
            <span className="meta-item">
              Joined {formatDate(new Date(profileUser.createdAt || Date.now()))}
            </span>
            {profileUser.role && (
              <span className="meta-item role-badge">{profileUser.role}</span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Posts ({userPosts.length})
          </button>
        </div>

        <div className="profile-tab-content">
          {activeTab === "posts" && (
            <div className="content-list">
              <div className="empty-state">No posts yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
