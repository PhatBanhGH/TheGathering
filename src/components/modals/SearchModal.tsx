import { useState, useEffect, useRef } from "react";
import "./SearchModal.css";

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  channelId?: string | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  channelId?: string;
  onMessageClick?: (messageId: string, channelId?: string) => void;
}

const SearchModal = ({
  isOpen,
  onClose,
  roomId,
  channelId,
  onMessageClick,
}: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: query,
        limit: "50",
      });
      if (channelId) {
        params.append("channelId", channelId);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL || "http://localhost:5001"}/api/chat/search/${roomId}?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error("Search failed");
        setResults([]);
      }
    } catch (error) {
      console.error("Error searching messages:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Hôm qua";
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString("vi-VN");
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm tin nhắn..."
              className="search-input"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
            {query && (
              <button
                className="search-clear-btn"
                onClick={() => setQuery("")}
                title="Xóa"
              >
                ✕
              </button>
            )}
          </div>
          <button className="search-close-btn" onClick={onClose} title="Đóng (Esc)">
            ✕
          </button>
        </div>

        <div className="search-results">
          {isSearching ? (
            <div className="search-loading">Đang tìm kiếm...</div>
          ) : hasSearched && results.length === 0 ? (
            <div className="search-empty">
              Không tìm thấy kết quả cho "{query}"
            </div>
          ) : hasSearched && results.length > 0 ? (
            <>
              <div className="search-results-header">
                {results.length} kết quả cho "{query}"
              </div>
              <div className="search-results-list">
                {results.map((msg) => (
                  <div
                    key={msg.id}
                    className="search-result-item"
                    onClick={() => {
                      onMessageClick?.(msg.id, msg.channelId || undefined);
                      onClose();
                    }}
                  >
                    <div className="search-result-header">
                      <span className="search-result-username">
                        {msg.username}
                      </span>
                      <span className="search-result-time">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                    <div className="search-result-message">
                      {highlightText(msg.message, query)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="search-empty">
              Nhập từ khóa để tìm kiếm tin nhắn
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;

