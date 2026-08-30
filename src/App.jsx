import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const ADMIN_CREDENTIALS = {
  email: "admin@bookhaven.com",
  password: "Admin@123",
};

const USER_CREDENTIALS = {
  email: "user@bookhaven.com",
  password: "User@123",
};

const initialBooks = [
  {
    id: 1,
    title: "The Silent Patient",
    author: "Alex Michaelides",
    category: "Thriller",
    isbn: "9781250301697",
    status: "Available",
    copies: 4,
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self Help",
    isbn: "9780735211292",
    status: "Available",
    copies: 5,
  },
  {
    id: 3,
    title: "The Alchemist",
    author: "Paulo Coelho",
    category: "Fiction",
    isbn: "9780062315007",
    status: "Issued",
    copies: 2,
  },
  {
    id: 4,
    title: "Ikigai",
    author: "Hector Garcia",
    category: "Lifestyle",
    isbn: "9780143130727",
    status: "Available",
    copies: 3,
  },
  {
    id: 5,
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Technology",
    isbn: "9780132350884",
    status: "Available",
    copies: 2,
  },
];

const initialMembers = [
  {
    id: 101,
    name: "Ananya Sharma",
    email: "ananya@example.com",
    phone: "+91 98765 43210",
    joined: "12 Aug 2026",
    borrowed: 2,
    status: "Active",
  },
  {
    id: 102,
    name: "Arjun Kumar",
    email: "arjun@example.com",
    phone: "+91 98765 12345",
    joined: "18 Aug 2026",
    borrowed: 1,
    status: "Active",
  },
  {
    id: 103,
    name: "Meera Raj",
    email: "meera@example.com",
    phone: "+91 91234 56789",
    joined: "21 Aug 2026",
    borrowed: 0,
    status: "Active",
  },
];

const initialActivities = [
  {
    id: 1,
    type: "issue",
    title: "Book issued",
    description: "The Alchemist was issued to Ananya Sharma.",
    time: "Today, 10:24 AM",
  },
  {
    id: 2,
    type: "member",
    title: "New member registered",
    description: "Meera Raj joined the library.",
    time: "Yesterday, 4:18 PM",
  },
  {
    id: 3,
    type: "return",
    title: "Book returned",
    description: "Atomic Habits was returned successfully.",
    time: "Yesterday, 11:40 AM",
  },
];

function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("library-theme") || "system"
  );

  const [session, setSession] = useState(
    JSON.parse(localStorage.getItem("library-session") || "null")
  );

  const [books, setBooks] = useState(() => {
    const savedBooks = localStorage.getItem("library-books");
    return savedBooks ? JSON.parse(savedBooks) : initialBooks;
  });

  const [members, setMembers] = useState(() => {
    const savedMembers = localStorage.getItem("library-members");
    return savedMembers ? JSON.parse(savedMembers) : initialMembers;
  });

  const [activities, setActivities] = useState(() => {
    const savedActivities = localStorage.getItem("library-activities");
    return savedActivities
      ? JSON.parse(savedActivities)
      : initialActivities;
  });

  const [loans, setLoans] = useState(() => {
    const savedLoans = localStorage.getItem("library-loans");
    return savedLoans ? JSON.parse(savedLoans) : [];
  });

  const [page, setPage] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(!session);
  const [loginRole, setLoginRole] = useState("admin");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("title");

  const [showMemberModal, setShowMemberModal] = useState(false);

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [showIssueModal, setShowIssueModal] = useState(false);

  const [issueForm, setIssueForm] = useState({
    memberId: "",
    bookId: "",
  });

  const [selectedMember, setSelectedMember] = useState(null);

  const [confirmBox, setConfirmBox] = useState(null);

  useEffect(() => {
    localStorage.setItem("library-theme", theme);

    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("library-books", JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem("library-members", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(
      "library-activities",
      JSON.stringify(activities)
    );
  }, [activities]);

  useEffect(() => {
    localStorage.setItem("library-loans", JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("library-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("library-session");
    }
  }, [session]);

  const filteredBooks = useMemo(() => {
    const query = search.toLowerCase().trim();

    let result = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query)
    );

    result.sort((a, b) =>
      String(a[sortBy]).localeCompare(String(b[sortBy]))
    );

    return result;
  }, [books, search, sortBy]);

  const addActivity = (activity) => {
    setActivities((prev) => [
      {
        id: Date.now(),
        ...activity,
        time: "Just now",
      },
      ...prev,
    ]);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    const credentials =
      loginRole === "admin"
        ? ADMIN_CREDENTIALS
        : USER_CREDENTIALS;

    if (
      loginEmail.trim().toLowerCase() === credentials.email &&
      loginPassword === credentials.password
    ) {
      const newSession = {
        name:
          loginRole === "admin"
            ? "Ananya Sharma"
            : "Arjun Kumar",
        role: loginRole,
        email: loginEmail,
      };

      setSession(newSession);
      setShowLogin(false);
      setPage("dashboard");
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError(
        "Invalid email or password. Please try again."
      );
    }
  };

  const requestLogout = () => {
    setConfirmBox({
      title: "Sign out?",
      message:
        "Are you sure you want to sign out of your account?",
      confirmText: "Yes, Sign Out",
      danger: true,
      action: () => {
        setSession(null);
        setShowLogin(true);
      },
    });
  };

  const addMember = () => {
    if (!memberForm.name || !memberForm.email) return;

    setConfirmBox({
      title: "Add this member?",
      message: `Create a new library membership for ${memberForm.name}?`,
      confirmText: "Add Member",

      action: () => {
        const newMember = {
          id: Date.now(),
          ...memberForm,
          joined: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          borrowed: 0,
          status: "Active",
        };

        setMembers((prev) => [...prev, newMember]);

        addActivity({
          type: "member",
          title: "New member registered",
          description: `${newMember.name} joined the library.`,
        });

        setMemberForm({
          name: "",
          email: "",
          phone: "",
        });

        setShowMemberModal(false);
      },
    });
  };

  const issueBook = () => {
    const member = members.find(
      (m) => String(m.id) === String(issueForm.memberId)
    );

    const book = books.find(
      (b) => String(b.id) === String(issueForm.bookId)
    );

    if (!member || !book) return;

    if (book.copies <= 0) {
      return;
    }

    setConfirmBox({
      title: "Issue this book?",
      message: `Issue "${book.title}" to ${member.name}?`,
      confirmText: "Issue Book",

      action: () => {
        const issueDate = new Date();

        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 14);

        const newLoan = {
          id: Date.now(),
          memberId: member.id,
          memberName: member.name,
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          issueDate: issueDate.toISOString(),
          dueDate: dueDate.toISOString(),
          status: "Active",
          returnedDate: null,
        };

        setLoans((prev) => [...prev, newLoan]);

        setBooks((prev) =>
          prev.map((b) =>
            b.id === book.id
              ? {
                  ...b,
                  status:
                    b.copies > 1
                      ? "Available"
                      : "Issued",
                  copies: Math.max(0, b.copies - 1),
                }
              : b
          )
        );

        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  borrowed: m.borrowed + 1,
                }
              : m
          )
        );

        addActivity({
          type: "issue",
          title: "Book issued",
          description: `${book.title} was issued to ${member.name}.`,
        });

        setIssueForm({
          memberId: "",
          bookId: "",
        });

        setShowIssueModal(false);
      },
    });
  };

  const returnLoan = (loan) => {
    const member = members.find(
      (m) => String(m.id) === String(loan.memberId)
    );

    const book = books.find(
      (b) => String(b.id) === String(loan.bookId)
    );

    if (!member || !book) return;

    setConfirmBox({
      title: "Return this book?",
      message: `Confirm return of "${book.title}" from ${member.name}?`,
      confirmText: "Return Book",

      action: () => {
        const returnedDate = new Date().toISOString();

        setLoans((prev) =>
          prev.map((item) =>
            item.id === loan.id
              ? {
                  ...item,
                  status: "Returned",
                  returnedDate,
                }
              : item
          )
        );

        setBooks((prev) =>
          prev.map((b) =>
            b.id === book.id
              ? {
                  ...b,
                  status: "Available",
                  copies: b.copies + 1,
                }
              : b
          )
        );

        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  borrowed: Math.max(
                    0,
                    m.borrowed - 1
                  ),
                }
              : m
          )
        );

        addActivity({
          type: "return",
          title: "Book returned",
          description: `${book.title} was returned by ${member.name}.`,
        });
      },
    });
  };

  if (showLogin || !session) {
    return (
      <LoginPage
        role={loginRole}
        setRole={setLoginRole}
        email={loginEmail}
        setEmail={setLoginEmail}
        password={loginPassword}
        setPassword={setLoginPassword}
        error={loginError}
        onSubmit={handleLogin}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        session={session}
        onLogout={requestLogout}
      />

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">LIBRARY OVERVIEW</p>

            <h1>
              {page === "dashboard"
                ? `Good morning, ${
                    session.name.split(" ")[0]
                  }`
                : pageTitle(page)}
            </h1>
          </div>

          <div className="topbar-actions">
            <ThemeSwitcher
              theme={theme}
              setTheme={setTheme}
            />

            <div className="profile-mini">
              <div className="avatar">
                {session.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <div>
                <strong>{session.name}</strong>

                <span>
                  {session.role === "admin"
                    ? "Administrator"
                    : "Member"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {page === "dashboard" && (
          <Dashboard
            books={books}
            members={members}
            activities={activities}
            setPage={setPage}
            onIssue={() => setShowIssueModal(true)}
          />
        )}

        {page === "books" && (
          <BooksPage
            books={filteredBooks}
            search={search}
            setSearch={setSearch}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onIssue={() => setShowIssueModal(true)}
            loans={loans}
            onReturn={returnLoan}
          />
        )}

        {page === "members" && (
          <MembersPage
            members={members}
            loans={loans}
            search={search}
            setSearch={setSearch}
            onAdd={() => setShowMemberModal(true)}
            onViewDetails={(member) =>
              setSelectedMember(member)
            }
          />
        )}

        {page === "issue" && (
          <IssuePage
            books={books}
            members={members}
            loans={loans}
            onIssue={() => setShowIssueModal(true)}
            onReturn={returnLoan}
          />
        )}

        {page === "history" && (
          <HistoryPage activities={activities} />
        )}

        {page === "recommendations" && (
          <Recommendations books={books} />
        )}
      </main>

      {showMemberModal && (
        <Modal
          title="Add New Member"
          onClose={() => setShowMemberModal(false)}
        >
          <div className="form-grid">
            <Input
              label="Full Name"
              value={memberForm.name}
              onChange={(e) =>
                setMemberForm({
                  ...memberForm,
                  name: e.target.value,
                })
              }
              placeholder="Enter member name"
            />

            <Input
              label="Email Address"
              value={memberForm.email}
              onChange={(e) =>
                setMemberForm({
                  ...memberForm,
                  email: e.target.value,
                })
              }
              placeholder="name@example.com"
            />

            <Input
              label="Phone Number"
              value={memberForm.phone}
              onChange={(e) =>
                setMemberForm({
                  ...memberForm,
                  phone: e.target.value,
                })
              }
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div className="modal-actions">
            <button
              className="btn secondary"
              onClick={() => setShowMemberModal(false)}
            >
              Cancel
            </button>

            <button
              className="btn primary"
              onClick={addMember}
            >
              Add Member
            </button>
          </div>
        </Modal>
      )}

      {showIssueModal && (
        <Modal
          title="Issue a Book"
          onClose={() => setShowIssueModal(false)}
        >
          <div className="form-grid">
            <label className="field">
              <span>Select Member</span>

              <select
                value={issueForm.memberId}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    memberId: e.target.value,
                  })
                }
              >
                <option value="">Choose member</option>

                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Select Book</span>

              <select
                value={issueForm.bookId}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    bookId: e.target.value,
                  })
                }
              >
                <option value="">Choose book</option>

                {books
                  .filter((book) => book.copies > 0)
                  .map((book) => (
                    <option
                      key={book.id}
                      value={book.id}
                    >
                      {book.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="modal-actions">
            <button
              className="btn secondary"
              onClick={() =>
                setShowIssueModal(false)
              }
            >
              Cancel
            </button>

            <button
              className="btn primary"
              onClick={issueBook}
            >
              Continue
            </button>
          </div>
        </Modal>
      )}

      {selectedMember && (
        <MemberDetailsModal
          member={selectedMember}
          loans={loans}
          onReturn={returnLoan}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {confirmBox && (
        <ConfirmModal
          {...confirmBox}
          onCancel={() => setConfirmBox(null)}
          onConfirm={() => {
            confirmBox.action();
            setConfirmBox(null);
          }}
        />
      )}
    </div>
  );
}

function LoginPage({
  role,
  setRole,
  email,
  setEmail,
  password,
  setPassword,
  error,
  onSubmit,
  theme,
  setTheme,
}) {
  return (
    <div className="login-page">
      <div className="login-theme">
        <ThemeSwitcher
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      <div className="login-card">
        <div className="brand-mark">
          <div className="brand-symbol">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="login-heading">
          <p className="eyebrow">WELCOME BACK</p>

          <h1>BookHaven</h1>

          <p>
            Smart library access, organized beautifully.
          </p>
        </div>

        <div className="role-switch">
          <button
            className={
              role === "admin" ? "active" : ""
            }
            onClick={() => setRole("admin")}
            type="button"
          >
            Admin
          </button>

          <button
            className={
              role === "user" ? "active" : ""
            }
            onClick={() => setRole("user")}
            type="button"
          >
            User
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="login-form"
        >
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder={
              role === "admin"
                ? "admin@bookhaven.com"
                : "user@bookhaven.com"
            }
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter your password"
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="btn primary login-button"
            type="submit"
          >
            Sign in as{" "}
            {role === "admin" ? "Admin" : "User"}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo access</strong>

          <span>
            {role === "admin"
              ? "admin@bookhaven.com  •  Admin@123"
              : "user@bookhaven.com  •  User@123"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  page,
  setPage,
  session,
  onLogout,
}) {
  const menu = [
    {
      id: "dashboard",
      icon: "⌂",
      label: "Dashboard",
    },
    {
      id: "books",
      icon: "▤",
      label: "Books",
    },
    {
      id: "members",
      icon: "♙",
      label: "Members",
    },
    {
      id: "issue",
      icon: "↔",
      label: "Issue / Return",
    },
    {
      id: "history",
      icon: "◷",
      label: "Activity",
    },
    {
      id: "recommendations",
      icon: "✦",
      label: "For You",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-symbol small">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div>
          <strong>BookHaven</strong>
          <span>Library Suite</span>
        </div>
      </div>

      <nav>
        <p className="nav-label">WORKSPACE</p>

        {menu.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              page === item.id ? "active" : ""
            }`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="side-profile">
          <div className="avatar">
            {session.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>

          <div>
            <strong>{session.name}</strong>
            <span>{session.role}</span>
          </div>
        </div>

        <button
          className="logout-btn"
          onClick={onLogout}
        >
          ↪ <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function Dashboard({
  books,
  members,
  activities,
  setPage,
  onIssue,
}) {
  const totalCopies = books.reduce(
    (sum, book) => sum + book.copies,
    0
  );

  const activeLoans = members.reduce(
    (sum, member) => sum + member.borrowed,
    0
  );

  return (
    <div className="page-content">
      <div className="welcome-banner">
        <div>
          <span className="banner-tag">
            YOUR LIBRARY, SIMPLIFIED
          </span>

          <h2>
            Everything you need to keep your library
            moving.
          </h2>

          <p>
            Manage your collection, members and
            lending activity from one organized
            workspace.
          </p>
        </div>

        <button
          className="btn white-btn"
          onClick={onIssue}
        >
          + Issue a Book
        </button>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Total Titles"
          value={books.length}
          detail="Across all categories"
          icon="▤"
        />

        <StatCard
          label="Available Copies"
          value={totalCopies}
          detail="Ready to borrow"
          icon="✓"
        />

        <StatCard
          label="Members"
          value={members.length}
          detail="Active members"
          icon="♙"
        />

        <StatCard
          label="Active Loans"
          value={activeLoans}
          detail="Currently issued"
          icon="↗"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                COLLECTION
              </p>

              <h3>Popular books</h3>
            </div>

            <button
              className="text-button"
              onClick={() => setPage("books")}
            >
              View all →
            </button>
          </div>

          <div className="book-list">
            {books.slice(0, 4).map((book) => (
              <BookRow
                key={book.id}
                book={book}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RECENT</p>
              <h3>Latest activity</h3>
            </div>

            <button
              className="text-button"
              onClick={() => setPage("history")}
            >
              View all →
            </button>
          </div>

          <ActivityList
            activities={activities.slice(0, 4)}
          />
        </section>
      </div>
    </div>
  );
}

function BooksPage({
  books,
  search,
  setSearch,
  sortBy,
  setSortBy,
  onIssue,
  loans,
  onReturn,
}) {
  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">COLLECTION</p>

          <h2>Books</h2>

          <p className="muted">
            Browse and manage your library collection.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={onIssue}
        >
          + Issue Book
        </button>
      </div>

      <div className="toolbar-controls">
        <div className="search-box">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search title, author, category or ISBN..."
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value)
          }
        >
          <option value="title">
            Sort by Title
          </option>

          <option value="author">
            Sort by Author
          </option>

          <option value="category">
            Sort by Category
          </option>

          <option value="status">
            Sort by Status
          </option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Book</th>
              <th>Category</th>
              <th>ISBN</th>
              <th>Copies</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {books.map((book) => {
              const activeLoan = loans.find(
                (loan) =>
                  loan.bookId === book.id &&
                  loan.status === "Active"
              );

              return (
                <tr key={book.id}>
                  <td>
                    <div className="table-book">
                      <div className="book-cover">
                        {book.title[0]}
                      </div>

                      <div>
                        <strong>
                          {book.title}
                        </strong>

                        <span>
                          {book.author}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{book.category}</td>

                  <td>{book.isbn}</td>

                  <td>{book.copies}</td>

                  <td>
                    <StatusBadge
                      status={book.status}
                    />
                  </td>

                  <td>
                    {book.copies > 0 ? (
                      <button
                        className="small-action"
                        onClick={onIssue}
                      >
                        Issue
                      </button>
                    ) : activeLoan ? (
                      <button
                        className="small-action"
                        onClick={() =>
                          onReturn(activeLoan)
                        }
                      >
                        Return
                      </button>
                    ) : (
                      <span>Unavailable</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {books.length === 0 && (
          <div className="empty-state">
            No books found for your search.
          </div>
        )}
      </div>
    </div>
  );
}

function MembersPage({
  members,
  loans,
  search,
  setSearch,
  onAdd,
  onViewDetails,
}) {
  const filtered = members.filter(
    (member) =>
      member.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.email
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">MEMBERS</p>

          <h2>Members</h2>

          <p className="muted">
            Keep track of active library members.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={onAdd}
        >
          + Add Member
        </button>
      </div>

      <div className="toolbar-controls">
        <div className="search-box">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search members..."
          />
        </div>
      </div>

      <div className="members-grid">
        {filtered.map((member) => {
          const memberLoans = loans.filter(
            (loan) =>
              loan.memberId === member.id &&
              loan.status === "Active"
          );

          return (
            <div
              className="member-card"
              key={member.id}
            >
              <div className="member-top">
                <div className="member-avatar">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <StatusBadge
                  status={member.status}
                />
              </div>

              <h3>{member.name}</h3>

              <p>{member.email}</p>

              <p>{member.phone}</p>

              <div className="member-meta">
                <span>
                  <strong>
                    {memberLoans.length}
                  </strong>{" "}
                  borrowed
                </span>

                <span>
                  Joined {member.joined}
                </span>
              </div>

              <button
                className="btn secondary small"
                style={{
                  width: "100%",
                  marginTop: "14px",
                }}
                onClick={() =>
                  onViewDetails(member)
                }
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          No members found.
        </div>
      )}
    </div>
  );
}

function IssuePage({
  books,
  members,
  loans,
  onIssue,
  onReturn,
}) {
  const activeLoans = loans.filter(
    (loan) => loan.status === "Active"
  );

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">LENDING</p>

          <h2>Issue & Return</h2>

          <p className="muted">
            Manage borrowing activity with a simple
            workflow.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={onIssue}
        >
          + Issue a Book
        </button>
      </div>

      <div className="info-banner">
        <span>✓</span>

        <div>
          <strong>
            Simple lending workflow
          </strong>

          <p>
            Select a member and available book to
            create a loan.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              CURRENT LOANS
            </p>

            <h3>Issued books</h3>
          </div>
        </div>

        {activeLoans.length > 0 ? (
          <div className="loan-list">
            {activeLoans.map((loan) => {
              const dueDate = new Date(
                loan.dueDate
              );

              const isOverdue =
                dueDate < new Date();

              return (
                <div
                  className="loan-item"
                  key={loan.id}
                >
                  <div className="book-cover">
                    {loan.bookTitle[0]}
                  </div>

                  <div className="loan-info">
                    <strong>
                      {loan.bookTitle}
                    </strong>

                    <span>
                      {loan.author}
                    </span>

                    <span>
                      Borrowed by{" "}
                      <strong>
                        {loan.memberName}
                      </strong>
                    </span>

                    <span>
                      Due:{" "}
                      {formatDate(
                        loan.dueDate
                      )}
                    </span>
                  </div>

                  <StatusBadge
                    status={
                      isOverdue
                        ? "Overdue"
                        : "Issued"
                    }
                  />

                  <button
                    className="btn secondary small"
                    onClick={() =>
                      onReturn(loan)
                    }
                  >
                    Return
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            No active loans right now.
          </div>
        )}
      </section>
    </div>
  );
}

function MemberDetailsModal({
  member,
  loans,
  onReturn,
  onClose,
}) {
  const memberLoans = loans.filter(
    (loan) => loan.memberId === member.id
  );

  const activeLoans = memberLoans.filter(
    (loan) => loan.status === "Active"
  );

  const returnedLoans = memberLoans.filter(
    (loan) => loan.status === "Returned"
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        style={{ width: "min(650px, 100%)" }}
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              MEMBER PROFILE
            </p>

            <h3>{member.name}</h3>

            <p
              className="muted"
              style={{ marginTop: "5px" }}
            >
              {member.email}
            </p>
          </div>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="stats-grid">
          <StatCard
            label="Active Loans"
            value={activeLoans.length}
            detail="Currently borrowed"
            icon="↗"
          />

          <StatCard
            label="Total Borrowed"
            value={memberLoans.length}
            detail="All loan records"
            icon="▤"
          />
        </div>

        <section
          className="panel"
          style={{
            marginTop: "18px",
            padding: "18px",
          }}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                CURRENT BORROWINGS
              </p>

              <h3>
                Books currently with {member.name}
              </h3>
            </div>
          </div>

          {activeLoans.length > 0 ? (
            <div className="loan-list">
              {activeLoans.map((loan) => {
                const dueDate = new Date(
                  loan.dueDate
                );

                const isOverdue =
                  dueDate < new Date();

                return (
                  <div
                    className="loan-item"
                    key={loan.id}
                  >
                    <div className="book-cover">
                      {loan.bookTitle[0]}
                    </div>

                    <div className="loan-info">
                      <strong>
                        {loan.bookTitle}
                      </strong>

                      <span>
                        {loan.author}
                      </span>

                      <span>
                        Issued:{" "}
                        {formatDate(
                          loan.issueDate
                        )}
                      </span>

                      <span>
                        Due:{" "}
                        {formatDate(
                          loan.dueDate
                        )}
                      </span>
                    </div>

                    <StatusBadge
                      status={
                        isOverdue
                          ? "Overdue"
                          : "Active"
                      }
                    />

                    <button
                      className="btn secondary small"
                      onClick={() =>
                        onReturn(loan)
                      }
                    >
                      Return
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              This member has no active borrowed
              books.
            </div>
          )}
        </section>

        {returnedLoans.length > 0 && (
          <section
            className="panel"
            style={{
              marginTop: "15px",
              padding: "18px",
            }}
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  LOAN HISTORY
                </p>

                <h3>
                  Previously returned books
                </h3>
              </div>
            </div>

            <div className="loan-list">
              {returnedLoans
                .slice()
                .reverse()
                .slice(0, 5)
                .map((loan) => (
                  <div
                    className="loan-item"
                    key={loan.id}
                  >
                    <div className="book-cover">
                      {loan.bookTitle[0]}
                    </div>

                    <div className="loan-info">
                      <strong>
                        {loan.bookTitle}
                      </strong>

                      <span>
                        Issued:{" "}
                        {formatDate(
                          loan.issueDate
                        )}
                      </span>

                      <span>
                        Returned:{" "}
                        {formatDate(
                          loan.returnedDate
                        )}
                      </span>
                    </div>

                    <StatusBadge status="Returned" />
                  </div>
                ))}
            </div>
          </section>
        )}

        <div className="modal-actions">
          <button
            className="btn secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ activities }) {
  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">
            ACTIVITY
          </p>

          <h2>Activity Timeline</h2>

          <p className="muted">
            A clear record of recent library activity.
          </p>
        </div>
      </div>

      <section className="panel timeline-panel">
        <ActivityList
          activities={activities}
          timeline
        />
      </section>
    </div>
  );
}

function Recommendations({ books }) {
  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">
            PERSONALIZED
          </p>

          <h2>Recommended for You</h2>

          <p className="muted">
            A few titles worth exploring from the
            collection.
          </p>
        </div>
      </div>

      <div className="recommendation-grid">
        {books.map((book) => (
          <div
            className="recommendation-card"
            key={book.id}
          >
            <div className="large-cover">
              {book.title[0]}
            </div>

            <div>
              <span className="category-label">
                {book.category}
              </span>

              <h3>{book.title}</h3>

              <p>{book.author}</p>

              <StatusBadge
                status={book.status}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{detail}</small>
      </div>
    </div>
  );
}

function BookRow({ book }) {
  return (
    <div className="book-row">
      <div className="book-cover">
        {book.title[0]}
      </div>

      <div className="book-row-info">
        <strong>{book.title}</strong>

        <span>{book.author}</span>
      </div>

      <StatusBadge
        status={book.status}
      />
    </div>
  );
}

function ActivityList({
  activities,
  timeline = false,
}) {
  return (
    <div
      className={`activity-list ${
        timeline ? "timeline" : ""
      }`}
    >
      {activities.map((activity) => (
        <div
          className="activity-item"
          key={activity.id}
        >
          <div
            className={`activity-icon ${activity.type}`}
          >
            {activity.type === "issue"
              ? "↗"
              : activity.type === "return"
              ? "↙"
              : "♙"}
          </div>

          <div className="activity-content">
            <strong>
              {activity.title}
            </strong>

            <p>
              {activity.description}
            </p>

            <span>{activity.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  let statusClass = "active-status";

  if (
    status === "Available" ||
    status === "Returned" ||
    status === "Active"
  ) {
    statusClass = "available";
  }

  if (
    status === "Issued" ||
    status === "Overdue"
  ) {
    statusClass = "issued";
  }

  return (
    <span
      className={`status ${statusClass}`}
    >
      <i></i>
      {status}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              ACTION
            </p>

            <h3>{title}</h3>
          </div>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmText,
  danger,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-modal">
        <div className="confirm-icon">
          {danger ? "!" : "?"}
        </div>

        <h3>{title}</h3>

        <p>{message}</p>

        <div className="modal-actions">
          <button
            className="btn secondary"
            onClick={onCancel}
          >
            No
          </button>

          <button
            className={`btn ${
              danger ? "danger" : "primary"
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label className="field">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function ThemeSwitcher({
  theme,
  setTheme,
}) {
  return (
    <select
      className="theme-select"
      value={theme}
      onChange={(e) =>
        setTheme(e.target.value)
      }
      aria-label="Theme"
    >
      <option value="light">
        ☀ Light
      </option>

      <option value="dark">
        ◐ Dark
      </option>

      <option value="system">
        ◉ System
      </option>
    </select>
  );
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pageTitle(page) {
  const titles = {
    books: "Book Collection",
    members: "Members",
    issue: "Issue & Return",
    history: "Activity Timeline",
    recommendations: "For You",
  };

  return titles[page] || "Dashboard";
}

export default App;