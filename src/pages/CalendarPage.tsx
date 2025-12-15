import { useState, useMemo } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useEvents } from "../contexts/EventContext";
import { InviteModal } from "../components/modals";
import "./CalendarPage.css";

const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  UserPlus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
  ),
  Link: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Fire: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.1.2-2.1.5-3h1.95a2.5 2.5 0 001.05 2.5z"></path>
    </svg>
  ),
};

// WhatsNewCard component removed - unused

const CalendarPage = () => {
  const { users } = useSocket();
  const { events } = useEvents();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  // const [showNewMeetingModal, setShowNewMeetingModal] = useState(false); // Unused for now

  const roomId = localStorage.getItem("roomId") || "default-room";

  // Get week dates
  const getWeekDates = () => {
    const week = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get hours for grid (03-23)
  const hours = Array.from({ length: 21 }, (_, i) => i + 3);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date
  const formatDate = (date: Date) => {
    const days = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
    return `${days[date.getDay()]} ${date.getDate()}`;
  };

  const formatMonthYear = (date: Date) => {
    const months = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];
    return `${months[date.getMonth()]} năm ${date.getFullYear()}`;
  };

  // Get current time position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    return hour + minutes / 60;
  };

  const currentTimePosition = getCurrentTimePosition();
  const isCurrentDay = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter events based on search - removed unused filteredEvents
  // Direct messages for invite preview - removed unused directMessages

  // Mini calendar for sidebar
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Mini calendar functions removed - unused

  return (
    <div className="calendar-page">
      {/* Left Sidebar removed */}

      {/* Khu vực lịch chính */}
      <div className="calendar-main full-width">
        {/* Thanh trên cùng */}
        <div className="calendar-header">
          <div className="calendar-header-left">
            <h1>My Virtual Office</h1>
            <div className="calendar-nav">
              <button className="nav-btn" onClick={goToPreviousWeek}>
                <Icons.ChevronLeft />
              </button>
              <button className="nav-btn" onClick={goToNextWeek}>
                <Icons.ChevronRight />
              </button>
              <button className="today-btn" onClick={goToToday}>
                Hôm nay
              </button>
              <span className="month-year">{formatMonthYear(currentDate)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="search-container-toolbar" style={{ width: "200px" }}>
              <div className="search-icon"><Icons.Search /></div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-toolbar"
              />
            </div>
            <button
              className="invite-button-toolbar"
              onClick={() => setShowInviteModal(true)}
            >
              <Icons.UserPlus /> Invite
            </button>
            <button
              className="new-meeting-btn"
            // onClick={() => setShowNewMeetingModal(true)} // Disabled for now
            >
              <Icons.Plus /> Cuộc họp mới
            </button>
          </div>
        </div>

        {/* Lưới lịch */}
        <div className="calendar-grid-container">
          {/* Tiêu đề ngày */}
          <div className="calendar-day-headers">
            {/* Empty cell for time column */}
            <div className="day-header time-column-header"></div>
            {weekDates.map((date, idx) => (
              <div
                key={idx}
                className={`day-header ${isCurrentDay(date) ? "today" : ""}`}
              >
                <div className="day-name">{formatDate(date)}</div>
              </div>
            ))}
          </div>

          {/* Lưới lịch */}
          <div className="calendar-grid">
            {/* Time Column */}
            <div className="time-column">
              {hours.map((hour) => (
                <div key={hour} className="hour-cell time-cell">
                  <span className="time-label">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Cột ngày */}
            {weekDates.map((date, dayIdx) => {
              const dayEvents = getEventsForDate(date);
              return (
                <div key={dayIdx} className="day-column">
                  {hours.map((hour) => {
                    const hourEvents = dayEvents.filter((event) => {
                      const eventHour = new Date(event.startTime).getHours();
                      return eventHour === hour;
                    });

                    return (
                      <div key={hour} className="hour-cell">
                        {hourEvents.map((event, eventIdx) => {
                          const startHour = new Date(event.startTime).getHours();
                          const startMin = new Date(event.startTime).getMinutes();
                          const endHour = new Date(event.endTime || event.startTime).getHours();
                          const endMin = new Date(event.endTime || event.startTime).getMinutes();
                          const top = (startMin / 60) * 100;
                          const height =
                            ((endHour - startHour) * 60 + (endMin - startMin)) / 60 * 100;

                          return (
                            <div
                              key={eventIdx}
                              className="calendar-event"
                              style={{
                                top: `${top}%`,
                                height: `${height}%`,
                              }}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {/* Current time indicator */}
                        {isCurrentDay(date) &&
                          hour === Math.floor(currentTimePosition) && (
                            <div
                              className="current-time-indicator"
                              style={{
                                top: `${(currentTimePosition % 1) * 100}%`,
                              }}
                            >
                              <div className="time-indicator-line"></div>
                              <div className="time-indicator-dot"></div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
      />
    </div>
  );
};

export default CalendarPage;
