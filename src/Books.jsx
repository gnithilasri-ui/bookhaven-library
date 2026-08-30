import React, { useMemo, useState } from "react";

const initialBooks = [
  {
    id: 1,
    title: "The Alchemist",
    author: "Paulo Coelho",
    category: "Fiction",
    isbn: "9780061122415",
    status: "Available",
    shelf: "A-12",
    year: 1988,
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self Development",
    isbn: "9780735211292",
    status: "Issued",
    shelf: "B-04",
    year: 2018,
  },
  {
    id: 3,
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Technology",
    isbn: "9780132350884",
    status: "Available",
    shelf: "C-08",
    year: 2008,
  },
  {
    id: 4,
    title: "Rich Dad Poor Dad",
    author: "Robert Kiyosaki",
    category: "Finance",
    isbn: "9781612681139",
    status: "Available",
    shelf: "D-02",
    year: 1997,
  },
  {
    id: 5,
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    category: "Technology",
    isbn: "9780262046305",
    status: "Issued",
    shelf: "C-14",
    year: 2009,
  },
];

export default function Books() {
  const [books, setBooks] = useState(initialBooks);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortBy, setSortBy] = useState("title");
  const [showAdd, setShowAdd] = useState(false);

  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    category: "Fiction",
    isbn: "",
    shelf: "",
    year: "",
  });

  const categories = [
    "All",
    ...new Set(books.map((book) => book.category)),
  ];

  const filteredBooks = useMemo(() => {
    let result = books.filter((book) => {
      const text = `${book.title} ${book.author} ${book.isbn}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (category === "All" || book.category === category) &&
        (status === "All" || book.status === status)
      );
    });

    result.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "author") return a.author.localeCompare(b.author);
      if (sortBy === "year") return b.year - a.year;
      return 0;
    });

    return result;
  }, [books, search, category, status, sortBy]);

  const handleAddBook = (e) => {
    e.preventDefault();

    if (!newBook.title || !newBook.author || !newBook.isbn) {
      alert("Please fill in the required fields.");
      return;
    }

    const book = {
      id: Date.now(),
      ...newBook,
      year: Number(newBook.year) || new Date().getFullYear(),
      status: "Available",
    };

    setBooks((prev) => [book, ...prev]);

    setNewBook({
      title: "",
      author: "",
      category: "Fiction",
      isbn: "",
      shelf: "",
      year: "",
    });

    setShowAdd(false);
  };

  const toggleStatus = (id) => {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === id
          ? {
              ...book,
              status:
                book.status === "Available" ? "Issued" : "Available",
            }
          : book
      )
    );
  };

  const deleteBook = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this book?"
    );

    if (!confirmed) return;

    setBooks((prev) => prev.filter((book) => book.id !== id));
  };

  return (
    <div className="books-page">
      {/* Header */}
      <div className="books-header">
        <div>
          <h1>Books</h1>
          <p>Manage your library collection</p>
        </div>

        <button
          className="add-book-btn"
          onClick={() => setShowAdd(true)}
        >
          + Add Book
        </button>
      </div>

      {/* Summary */}
      <div className="book-stats">
        <div className="book-stat-card">
          <div className="stat-icon">📚</div>
          <div>
            <span>Total Books</span>
            <strong>{books.length}</strong>
          </div>
        </div>

        <div className="book-stat-card">
          <div className="stat-icon">✓</div>
          <div>
            <span>Available</span>
            <strong>
              {books.filter((b) => b.status === "Available").length}
            </strong>
          </div>
        </div>

        <div className="book-stat-card">
          <div className="stat-icon">↗</div>
          <div>
            <span>Issued</span>
            <strong>
              {books.filter((b) => b.status === "Issued").length}
            </strong>
          </div>
        </div>

        <div className="book-stat-card">
          <div className="stat-icon">▦</div>
          <div>
            <span>Categories</span>
            <strong>{categories.length - 1}</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="books-toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search books, authors or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All</option>
          <option>Available</option>
          <option>Issued</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="title">Sort: Title</option>
          <option value="author">Sort: Author</option>
          <option value="year">Sort: Year</option>
        </select>
      </div>

      {/* Book Table */}
      <div className="books-card">
        <div className="table-heading">
          <div>
            <h2>Library Collection</h2>
            <p>{filteredBooks.length} books found</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>BOOK</th>
                <th>AUTHOR</th>
                <th>CATEGORY</th>
                <th>ISBN</th>
                <th>SHELF</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>
                    <div className="book-title">
                      <div className="book-cover">
                        {book.title.charAt(0)}
                      </div>

                      <div>
                        <strong>{book.title}</strong>
                        <small>{book.year}</small>
                      </div>
                    </div>
                  </td>

                  <td>{book.author}</td>

                  <td>
                    <span className="category-badge">
                      {book.category}
                    </span>
                  </td>

                  <td>{book.isbn}</td>

                  <td>{book.shelf}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        book.status === "Available"
                          ? "available"
                          : "issued"
                      }`}
                    >
                      <span className="status-dot"></span>
                      {book.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        title="Change status"
                        onClick={() => toggleStatus(book.id)}
                      >
                        ↻
                      </button>

                      <button
                        title="Remove book"
                        className="delete-btn"
                        onClick={() => deleteBook(book.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBooks.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="empty-books">
                      <div>📚</div>
                      <h3>No books found</h3>
                      <p>Try changing your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Book Modal */}
      {showAdd && (
        <div
          className="modal-overlay"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="add-book-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Add New Book</h2>
                <p>Add a book to your collection</p>
              </div>

              <button onClick={() => setShowAdd(false)}>×</button>
            </div>

            <form onSubmit={handleAddBook}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Book Title *</label>
                  <input
                    value={newBook.title}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        title: e.target.value,
                      })
                    }
                    placeholder="Enter book title"
                  />
                </div>

                <div className="form-group">
                  <label>Author *</label>
                  <input
                    value={newBook.author}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        author: e.target.value,
                      })
                    }
                    placeholder="Author name"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newBook.category}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        category: e.target.value,
                      })
                    }
                  >
                    <option>Fiction</option>
                    <option>Technology</option>
                    <option>Self Development</option>
                    <option>Finance</option>
                    <option>Science</option>
                    <option>History</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ISBN *</label>
                  <input
                    value={newBook.isbn}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        isbn: e.target.value,
                      })
                    }
                    placeholder="ISBN number"
                  />
                </div>

                <div className="form-group">
                  <label>Shelf</label>
                  <input
                    value={newBook.shelf}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        shelf: e.target.value,
                      })
                    }
                    placeholder="e.g. A-12"
                  />
                </div>

                <div className="form-group">
                  <label>Publication Year</label>
                  <input
                    type="number"
                    value={newBook.year}
                    onChange={(e) =>
                      setNewBook({
                        ...newBook,
                        year: e.target.value,
                      })
                    }
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn">
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}