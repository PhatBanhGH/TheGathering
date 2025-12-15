import { useState, useEffect } from "react";
import { useEvents } from "../../contexts/EventContext";
import { useSocket } from "../../contexts/SocketContext";
import "./EventModal.css";

interface EventModalProps {
  event?: any;
  selectedDate?: Date;
  onClose: () => void;
}

const EventModal = ({ event, selectedDate, onClose }: EventModalProps) => {
  const { createEvent, updateEvent, deleteEvent, rsvpEvent } = useEvents();
  const { currentUser } = useSocket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setStartTime(new Date(event.startTime).toISOString().slice(0, 16));
      setEndTime(new Date(event.endTime).toISOString().slice(0, 16));
      setLocation(event.location);
    } else if (selectedDate) {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      setStartTime(`${dateStr}T10:00`);
      setEndTime(`${dateStr}T11:00`);
    }
  }, [event, selectedDate]);

  const handleSave = async () => {
    if (!title.trim() || !startTime || !endTime) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      if (event) {
        await updateEvent(event.eventId, {
          title,
          description,
          startTime,
          endTime,
          location,
        });
      } else {
        await createEvent({
          title,
          description,
          startTime,
          endTime,
          location,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Are you sure you want to delete this event?"))
      return;

    try {
      await deleteEvent(event.eventId);
      onClose();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };

  const handleRSVP = async (status: "going" | "maybe" | "not_going") => {
    if (!event) return;
    await rsvpEvent(event.eventId, status);
  };

  const userRSVP = event?.attendees?.find(
    (a: any) => a.userId === currentUser?.userId
  )?.status;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <h2>{event ? "Edit Event" : "Create Event"}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="event-modal-content">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
              rows={4}
            />
          </div>

          {event && (
            <div className="event-rsvp">
              <h3>RSVP</h3>
              <div className="rsvp-buttons">
                <button
                  className={`rsvp-btn ${userRSVP === "going" ? "active" : ""}`}
                  onClick={() => handleRSVP("going")}
                >
                  ✓ Going
                </button>
                <button
                  className={`rsvp-btn ${userRSVP === "maybe" ? "active" : ""}`}
                  onClick={() => handleRSVP("maybe")}
                >
                  ? Maybe
                </button>
                <button
                  className={`rsvp-btn ${userRSVP === "not_going" ? "active" : ""}`}
                  onClick={() => handleRSVP("not_going")}
                >
                  ✗ Not Going
                </button>
              </div>
              <div className="attendees-list">
                <h4>Attendees ({event.attendees?.length || 0})</h4>
                {event.attendees?.map((attendee: any) => (
                  <div key={attendee.userId} className="attendee-item">
                    <span>{attendee.username}</span>
                    <span className={`status ${attendee.status}`}>
                      {attendee.status === "going" && "✓"}
                      {attendee.status === "maybe" && "?"}
                      {attendee.status === "not_going" && "✗"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="event-modal-actions">
            {event && event.createdBy === currentUser?.userId && (
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <div className="action-buttons">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;

