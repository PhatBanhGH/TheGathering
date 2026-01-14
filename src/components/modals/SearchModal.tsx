import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../../utils/date";
import "./SearchModal.css";

interface SearchResult {
  type: "user";
  id: string;
  title: string;
  content?: string;
  author?: string;
  createdAt: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["user"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedTypes]);

  const performSearch = async () => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const typesParam = selectedTypes.join(",");
      const response = await fetch(
        `${serverUrl}/api/search?q=${encodeURIComponent(
          query
        )}&types=${typesParam}&limit=20`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error performing search:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "user") {
      navigate(`/app/profile/${result.id}`);
      onClose();
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getResultIcon = (type: string) => {
    if (type === "user") return "👤";
    return "🔍";
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
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {query && (
              <button
                className="clear-search-btn"
                onClick={() => setQuery("")}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
          <button className="close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        <div className="search-results">
          {loading ? (
            <div className="search-loading">Searching...</div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="search-empty">No results found</div>
          ) : query.length < 2 ? (
            <div className="search-empty">
              Type at least 2 characters to search
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}-${index}`}
                className="search-result-item"
                onClick={() => handleResultClick(result)}
              >
                <div className="result-icon">{getResultIcon(result.type)}</div>
                <div className="result-content">
                  <div className="result-title">{result.title}</div>
                  {result.content && (
                    <div className="result-snippet">{result.content}</div>
                  )}
                  <div className="result-meta">
                    {result.author && (
                      <span className="result-author">{result.author}</span>
                    )}
                    <span className="result-type">{result.type}</span>
                    <span className="result-time">
                      {formatRelativeTime(result.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="search-footer">
          <span className="search-hint">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
