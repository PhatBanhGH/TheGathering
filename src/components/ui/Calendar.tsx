import { useState } from "react";
import { useEvents } from "../../contexts/EventContext";
import { EventModal } from "../modals";
import "./Calendar.css";

const Calendar = () => {
  const { events } = useEvents();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
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

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const days = getDaysInMonth(selectedDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const prevMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
    );
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={prevMonth} className="calendar-nav-btn">
          ‹
        </button>
        <h2>
          {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </h2>
        <button onClick={nextMonth} className="calendar-nav-btn">
          ›
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-days">
          {days.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isToday =
              date &&
              date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`calendar-day ${!date ? "empty" : ""} ${
                  isToday ? "today" : ""
                }`}
                onClick={() => {
                  if (date) {
                    setSelectedEvent(null);
                    setShowEventModal(true);
                  }
                }}
              >
                {date && (
                  <>
                    <div className="day-number">{date.getDate()}</div>
                    {dayEvents.length > 0 && (
                      <div className="day-events">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.eventId}
                            className="event-dot"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                            title={event.title}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="event-more">+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-actions">
        <button
          className="btn-primary"
          onClick={() => {
            setSelectedEvent(null);
            setShowEventModal(true);
          }}
        >
          + Create Event
        </button>
      </div>

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          selectedDate={selectedDate}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default Calendar;
