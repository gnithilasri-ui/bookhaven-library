import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import "./App.css";



const initialBooks = [];



const initialMembers = [];



const initialActivities = [];



const FINE_PER_DAY = 10;
const LOAN_PERIOD_DAYS = 14;
const QUEUE_LIMIT = 3;

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDaysOverdue(dueDate, endDate = new Date()) {
  const due = startOfDay(dueDate);
  const end = startOfDay(endDate);
  if (end <= due) return 0;
  return Math.floor((end - due) / 86400000);
}

function getFine(dueDate, endDate = new Date()) {
  return getDaysOverdue(dueDate, endDate) * FINE_PER_DAY;
}

function getDaysUntilDue(dueDate) {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  return Math.round((due - today) / 86400000);
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function getUserLoans(loans, session) {
  if (!session) return [];
  return loans.filter(
    (loan) =>
      loan.memberId === session.memberId ||
      loan.memberName === session.name
  );
}

function buildRecommendations(books, loans, session) {
  const myLoans = getUserLoans(loans, session);
  const borrowedBookIds = new Set(myLoans.map((loan) => loan.bookId));
  const preferredCategories = new Set(
    myLoans
      .map((loan) => books.find((book) => book.id === loan.bookId)?.category)
      .filter(Boolean)
  );

  const preferred = books.filter(
    (book) =>
      !borrowedBookIds.has(book.id) &&
      book.copies > 0 &&
      preferredCategories.has(book.category)
  );

  const remaining = books.filter(
    (book) => !borrowedBookIds.has(book.id) && book.copies > 0
  );

  return [...preferred, ...remaining].slice(0, 4);
}


function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("library-theme") || "system"
  );
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("library-session") || "null");
    } catch {
      return null;
    }
  });
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem("library-books-clean-v1");
      return saved ? JSON.parse(saved) : initialBooks;
    } catch {
      return initialBooks;
    }
  });
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem("library-members-clean-v1");
      return saved ? JSON.parse(saved) : initialMembers;
    } catch {
      return initialMembers;
    }
  });
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem("library-activities-clean-v1");
      return saved ? JSON.parse(saved) : initialActivities;
    } catch {
      return initialActivities;
    }
  });
  const [loans, setLoans] = useState(() => {
    try {
      const saved = localStorage.getItem("library-loans-clean-v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [waiting, setWaiting] = useState(() => {
    try {
      const saved = localStorage.getItem("library-waiting-clean-v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [page, setPage] = useState("dashboard");
  const [profileName, setProfileName] = useState(() => session?.name || "");
  const [profileUsername, setProfileUsername] = useState(() => session?.username || "");
  const [profileEmail, setProfileEmail] = useState(() => session?.email || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [showLogin, setShowLogin] = useState(!session);
  const [loginRole, setLoginRole] = useState("admin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", phone: "" });
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookForm, setBookForm] = useState({ title: "", author: "", category: "", isbn: "", copies: "1" });
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ memberId: "", bookId: "", dueDateMode: "automatic", manualDueDate: "" });
  const [selectedMember, setSelectedMember] = useState(null);
  const [confirmBox, setConfirmBox] = useState(null);

  useEffect(() => {
    localStorage.setItem("library-theme", theme);
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem("library-books-clean-v1", JSON.stringify(books)), [books]);
  useEffect(() => localStorage.setItem("library-members-clean-v1", JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem("library-activities-clean-v1", JSON.stringify(activities)), [activities]);
  useEffect(() => localStorage.setItem("library-loans-clean-v1", JSON.stringify(loans)), [loans]);
  useEffect(() => localStorage.setItem("library-waiting-clean-v1", JSON.stringify(waiting)), [waiting]);
  useEffect(() => {
    if (session) localStorage.setItem("library-session", JSON.stringify(session));
    else localStorage.removeItem("library-session");
  }, [session]);

  const filteredBooks = useMemo(() => {
    const query = search.toLowerCase().trim();
    const result = books.filter((book) =>
      [book.title, book.author, book.category, book.isbn]
        .some((value) => String(value).toLowerCase().includes(query))
    );
    result.sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")));
    return result;
  }, [books, search, sortBy]);

  const addActivity = (activity) => {
    setActivities((prev) => [
      { id: Date.now(), ...activity, time: "Just now" },
      ...prev,
    ]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await axios.post("http://127.0.0.1:5000/api/login", {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        role: loginRole,
      });

      const user = response.data.user || response.data;

      const newSession = {
        name: user.name,
        username: user.username || user.user_name || "",
        role: user.role,
        email: user.email,
        memberId: user.memberId || user.member_id || null,
      };

      setSession(newSession);
      setProfileName(newSession.name || "");
      setProfileUsername(newSession.username || "");
      setProfileEmail(newSession.email || "");
      setProfileMessage("");
      setShowLogin(false);
      setPage("dashboard");
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(
        error.response?.data?.message ||
        "Invalid email or password. Please try again."
      );
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginRole !== "user") {
      setLoginError("Please select User to create a member account.");
      return;
    }
    if (loginPassword.length < 8) {
      setLoginError("Password must contain at least 8 characters.");
      return;
    }
    if (loginPassword !== registerConfirmPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    try {
      if (!registerUsername.trim()) {
        setLoginError("Please enter a username.");
        return;
      }
      await axios.post("http://127.0.0.1:5000/api/register", {
        name: registerName.trim(),
        username: registerUsername.trim(),
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        confirmPassword: registerConfirmPassword,
      });
      setShowRegister(false);
      setLoginRole("user");
      setRegisterName("");
      setRegisterUsername("");
      setRegisterConfirmPassword("");
      setLoginPassword("");
      setLoginError("Account created successfully. Please sign in.");
    } catch (error) {
      console.error("Registration failed:", error);
      setLoginError(error.response?.data?.message || error.response?.data?.error ||
        "Could not create account. Check the details and try again.");
    }
  };

  const requestLogout = () => {
    setConfirmBox({
      title: "Sign out?",
      message: "Are you sure you want to sign out of your account?",
      confirmText: "Yes, Sign Out",
      danger: true,
      action: () => {
        setSession(null);
        setShowLogin(true);
        setPage("dashboard");
      },
    });
  };

  const addBook = () => {
    const title = bookForm.title.trim();
    const author = bookForm.author.trim();
    const category = bookForm.category.trim();
    const isbn = bookForm.isbn.trim();
    const copies = Number(bookForm.copies);
    if (!title || !author || !category || !isbn || !Number.isInteger(copies) || copies < 1) {
      setConfirmBox({ title: "Check book details", message: "Enter the title, author, category, ISBN, and a whole number of copies (at least 1).", confirmText: "Okay", action: () => {} });
      return;
    }
    if (books.some((book) => book.isbn.trim().toLowerCase() === isbn.toLowerCase())) {
      setConfirmBox({ title: "ISBN already exists", message: "A book with this ISBN is already in your collection.", confirmText: "Okay", action: () => {} });
      return;
    }
    const newBook = { id: Date.now(), title, author, category, isbn, copies, status: "Available" };
    setBooks((prev) => [...prev, newBook]);
    addActivity({ type: "book", title: "New book added", description: `${title} by ${author} was added to the collection.` });
    setBookForm({ title: "", author: "", category: "", isbn: "", copies: "1" });
    setShowBookModal(false);
  };

  const addMember = () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) return;
    setConfirmBox({
      title: "Add this member?",
      message: `Create a new library membership for ${memberForm.name}?`,
      confirmText: "Add Member",
      action: () => {
        const newMember = {
          id: Date.now(),
          ...memberForm,
          joined: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          borrowed: 0,
          status: "Active",
        };
        setMembers((prev) => [...prev, newMember]);
        addActivity({ type: "member", title: "New member registered", description: `${newMember.name} joined the library.` });
        setMemberForm({ name: "", email: "", phone: "" });
        setShowMemberModal(false);
      },
    });
  };

  const issueBook = () => {
    const member = members.find((m) => String(m.id) === String(issueForm.memberId));
    const book = books.find((b) => String(b.id) === String(issueForm.bookId));
    if (!member || !book || book.copies <= 0) return;

    const alreadyBorrowed = loans.some(
      (loan) => loan.memberId === member.id && loan.bookId === book.id && loan.status === "Active"
    );
    if (alreadyBorrowed) {
      setConfirmBox({ title: "Already issued", message: `${member.name} already has this book.`, confirmText: "Okay", action: () => {} });
      return;
    }

    const activeCount = loans.filter((loan) => loan.memberId === member.id && loan.status === "Active").length;
    if (activeCount >= 3) {
      setConfirmBox({ title: "Borrowing limit reached", message: `${member.name} already has 3 active books. Return a book before issuing another.`, confirmText: "Okay", action: () => {} });
      return;
    }

    const issueDate = new Date();
    let dueDate;

    if (issueForm.dueDateMode === "manual") {
      if (!issueForm.manualDueDate) {
        setConfirmBox({
          title: "Select a due date",
          message: "Please choose a manual due date before issuing the book.",
          confirmText: "Okay",
          action: () => {},
        });
        return;
      }

      dueDate = new Date(`${issueForm.manualDueDate}T23:59:59`);
      if (Number.isNaN(dueDate.getTime()) || dueDate <= issueDate) {
        setConfirmBox({
          title: "Invalid due date",
          message: "Manual due date must be after today's issue date.",
          confirmText: "Okay",
          action: () => {},
        });
        return;
      }
    } else {
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
    }

    const dueDateText = issueForm.dueDateMode === "manual"
      ? formatDate(dueDate.toISOString())
      : `${LOAN_PERIOD_DAYS} days from today`;

    setConfirmBox({
      title: "Issue this book?",
      message: `Issue "${book.title}" to ${member.name}? Due date: ${dueDateText}.`,
      confirmText: "Issue Book",
      action: () => {
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
          finePaid: false,
        };
        setLoans((prev) => [...prev, newLoan]);
        setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, status: b.copies > 1 ? "Available" : "Issued", copies: Math.max(0, b.copies - 1) } : b));
        setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, borrowed: m.borrowed + 1 } : m));
        setWaiting((prev) => prev.filter((item) => !(item.memberId === member.id && item.bookId === book.id)));
        addActivity({ type: "issue", title: "Book issued", description: `${book.title} was issued to ${member.name}.` });
        setIssueForm({ memberId: "", bookId: "", dueDateMode: "automatic", manualDueDate: "" });
        setShowIssueModal(false);
      },
    });
  };

  const returnLoan = (loan) => {
    const member = members.find((m) => String(m.id) === String(loan.memberId));
    const book = books.find((b) => String(b.id) === String(loan.bookId));
    if (!member || !book) return;
    const fine = getFine(loan.dueDate, new Date());
    setConfirmBox({
      title: "Return this book?",
      message: fine > 0
        ? `This book is ${getDaysOverdue(loan.dueDate)} day(s) overdue. Current fine: ${formatMoney(fine)}.`
        : `Confirm return of "${book.title}" from ${member.name}?`,
      confirmText: "Return Book",
      action: () => {
        const returnedDate = new Date().toISOString();
        setLoans((prev) => prev.map((item) => item.id === loan.id ? { ...item, status: "Returned", returnedDate, finePaid: fine === 0 ? true : Boolean(item.finePaid) } : item));
        setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, status: "Available", copies: b.copies + 1 } : b));
        setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, borrowed: Math.max(0, m.borrowed - 1) } : m));
        addActivity({ type: "return", title: "Book returned", description: `${book.title} was returned by ${member.name}${fine > 0 ? ` with ${formatMoney(fine)} fine pending.` : "."}` });
        const next = waiting.find((item) => item.bookId === book.id && item.memberId !== member.id);
        if (next) addActivity({ type: "queue", title: "Waiting queue updated", description: `${next.member} is next for ${book.title}.` });
      },
    });
  };

  const markFinePaid = (loan) => {
    const fine = getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date());
    if (fine <= 0) return;
    setLoans((prev) => prev.map((item) => item.id === loan.id ? { ...item, finePaid: true } : item));
    addActivity({ type: "fine", title: "Fine paid", description: `${loan.memberName} paid ${formatMoney(fine)} for ${loan.bookTitle}.` });
  };

  const joinQueue = (book) => {
    if (!session || session.role !== "user") return;
    const myQueueCount = waiting.filter((item) => item.memberId === session.memberId).length;
    if (myQueueCount >= QUEUE_LIMIT) {
      setConfirmBox({ title: "Queue limit reached", message: `You can have up to ${QUEUE_LIMIT} waiting requests at a time.`, confirmText: "Okay", action: () => {} });
      return;
    }
    const exists = waiting.some((item) => item.memberId === session.memberId && item.bookId === book.id);
    if (exists) {
      setConfirmBox({ title: "Already in queue", message: `You are already waiting for ${book.title}.`, confirmText: "Okay", action: () => {} });
      return;
    }
    const item = {
      id: Date.now(),
      memberId: session.memberId,
      member: session.name,
      bookId: book.id,
      book: book.title,
      requestedOn: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setWaiting((prev) => [...prev, item]);
    addActivity({ type: "queue", title: "Waiting request added", description: `${session.name} joined the queue for ${book.title}.` });
  };

  const removeQueue = (id) => setWaiting((prev) => prev.filter((item) => item.id !== id));

  const recommendations = useMemo(
    () => buildRecommendations(books, loans, session),
    [books, loans, session]
  );

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
        onSubmit={showRegister ? handleRegister : handleLogin}
        showRegister={showRegister}
        setShowRegister={setShowRegister}
        registerName={registerName}
        setRegisterName={setRegisterName}
        registerUsername={registerUsername}
        setRegisterUsername={setRegisterUsername}
        confirmPassword={registerConfirmPassword}
        setConfirmPassword={setRegisterConfirmPassword}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} session={session} onLogout={requestLogout} />
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{session.role === "admin" ? "ADMINISTRATOR" : "MEMBER PORTAL"}</p>
            <h1>{page === "dashboard" ? `Good morning, ${session.name.split(" ")[0]}` : pageTitle(page)}</h1>
          </div>
          <div className="topbar-actions">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <div className="profile-mini">
              <div className="avatar">{session.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
              <div><strong>{session.name}</strong><span>{session.role === "admin" ? "Administrator" : "Member"}</span></div>
            </div>
          </div>
        </header>

        {page === "profile" && (
          <ProfilePage
            session={session}
            name={profileName}
            username={profileUsername}
            setUsername={setProfileUsername}
            setName={setProfileName}
            email={profileEmail}
            setEmail={setProfileEmail}
            message={profileMessage}
            onSave={() => {
              const cleanName = profileName.trim();
              const cleanEmail = profileEmail.trim().toLowerCase();
              if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                setProfileMessage("Please enter a valid name and email address.");
                return;
              }
              const updatedSession = { ...session, name: cleanName, username: profileUsername.trim(), email: cleanEmail };
              setSession(updatedSession);
              setProfileName(cleanName);
              setProfileUsername(profileUsername.trim());
              setProfileEmail(cleanEmail);
              setProfileMessage("Profile updated in this browser session. For permanent account updates across devices, the backend profile-update API must also be implemented.");
            }}
          />
        )}
        {page === "dashboard" && session.role === "admin" && (
          <AdminDashboard books={books} members={members} loans={loans} activities={activities} waiting={waiting} setPage={setPage} onIssue={() => setShowIssueModal(true)} onMarkFinePaid={markFinePaid} />
        )}
        {page === "dashboard" && session.role === "user" && (
          <UserDashboard books={books} loans={loans} waiting={waiting} activities={activities} session={session} recommendations={recommendations} setPage={setPage} />
        )}
        {page === "books" && (
          <BooksPage books={filteredBooks} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} isAdmin={session.role === "admin"} onAddBook={() => setShowBookModal(true)} onIssue={() => setShowIssueModal(true)} loans={loans} onReturn={returnLoan} waiting={waiting} session={session} onJoinQueue={joinQueue} />
        )}
        {page === "ebooks" && <EbooksPage role={session.role} />}
        {page === "members" && session.role === "admin" && (
          <MembersPage members={members} loans={loans} search={search} setSearch={setSearch} onAdd={() => setShowMemberModal(true)} onViewDetails={(member) => setSelectedMember(member)} />
        )}
        {page === "issue" && session.role === "admin" && (
          <IssuePage books={books} members={members} loans={loans} onIssue={() => setShowIssueModal(true)} onReturn={returnLoan} />
        )}
        {page === "history" && <HistoryPage activities={activities} session={session} />}
        {page === "recommendations" && <Recommendations books={recommendations.length ? recommendations : books.filter((b) => b.copies > 0)} />}
        {page === "waiting" && <WaitingPage waiting={waiting} session={session} onRemove={removeQueue} />}
      </main>

      {session.role === "admin" && showBookModal && (
        <Modal title="Add New Book" onClose={() => setShowBookModal(false)}>
          <div className="form-grid">
            <Input label="Book Title" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} placeholder="Enter book title" />
            <Input label="Author" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} placeholder="Enter author name" />
            <Input label="Category" value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} placeholder="e.g. Technology, Fiction" />
            <Input label="ISBN" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} placeholder="Enter unique ISBN" />
            <Input label="Number of Copies" type="number" value={bookForm.copies} onChange={(e) => setBookForm({ ...bookForm, copies: e.target.value })} placeholder="1" />
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowBookModal(false)}>Cancel</button>
            <button className="btn primary" onClick={addBook}>Add Book</button>
          </div>
        </Modal>
      )}

      {session.role === "admin" && showMemberModal && (
        <Modal title="Add New Member" onClose={() => setShowMemberModal(false)}>
          <div className="form-grid">
            <Input label="Full Name" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Enter member name" />
            <Input label="Email Address" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="name@example.com" />
            <Input label="Phone Number" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
            <button className="btn primary" onClick={addMember}>Add Member</button>
          </div>
        </Modal>
      )}

      {session.role === "admin" && showIssueModal && (
        <Modal title="Issue a Book" onClose={() => setShowIssueModal(false)}>
          <div className="form-grid">
            <label className="field"><span>Select Member</span>
              <select value={issueForm.memberId} onChange={(e) => setIssueForm({ ...issueForm, memberId: e.target.value })}>
                <option value="">Choose member</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Select Book</span>
              <select value={issueForm.bookId} onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}>
                <option value="">Choose book</option>
                {books.filter((book) => book.copies > 0).map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
              </select>
            </label>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <span>Due Date Mode</span>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="dueDateMode"
                  value="automatic"
                  checked={issueForm.dueDateMode === "automatic"}
                  onChange={() => setIssueForm({ ...issueForm, dueDateMode: "automatic" })}
                />
                <span>Automatic — {LOAN_PERIOD_DAYS} days</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="dueDateMode"
                  value="manual"
                  checked={issueForm.dueDateMode === "manual"}
                  onChange={() => setIssueForm({ ...issueForm, dueDateMode: "manual" })}
                />
                <span>Manual — choose date</span>
              </label>
            </div>
          </div>

          {issueForm.dueDateMode === "automatic" ? (
            <div className="field" style={{ marginTop: 14 }}>
              <span>Due Date</span>
              <div className="input-like" style={{ marginTop: 6, padding: "11px 13px", border: "1px solid var(--border)", borderRadius: 10 }}>
                Automatically set to {formatDate(new Date(Date.now() + LOAN_PERIOD_DAYS * 86400000).toISOString())}
              </div>
            </div>
          ) : (
            <label className="field" style={{ marginTop: 14 }}>
              <span>Manual Due Date</span>
              <input
                type="date"
                value={issueForm.manualDueDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setIssueForm({ ...issueForm, manualDueDate: e.target.value })}
              />
            </label>
          )}
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
            <button className="btn primary" onClick={issueBook}>Continue</button>
          </div>
        </Modal>
      )}

      {selectedMember && session.role === "admin" && (
        <MemberDetailsModal member={selectedMember} loans={loans} onReturn={returnLoan} onClose={() => setSelectedMember(null)} />
      )}

      {confirmBox && (
        <ConfirmModal {...confirmBox} onCancel={() => setConfirmBox(null)} onConfirm={() => { confirmBox.action(); setConfirmBox(null); }} />
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
  showRegister,
  setShowRegister,
  registerName,
  setRegisterName,
  registerUsername,
  setRegisterUsername,
  confirmPassword,
  setConfirmPassword,
  theme,
  setTheme,
}) {
  const switchRole = (nextRole) => {
    setRole(nextRole);
    setShowRegister(false);
  };

  return (
    <div className="login-page">
      <div className="login-theme">
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </div>
      <div className="login-card">
        <div className="brand-mark">
          <div className="brand-symbol"><span></span><span></span><span></span></div>
        </div>
        <div className="login-heading">
          <p className="eyebrow">{showRegister ? "JOIN OUR LIBRARY" : "WELCOME BACK"}</p>
          <h1>BookHaven</h1>
          <p>Smart library access, organized beautifully.</p>
        </div>

        <div className="role-switch">
          <button className={role === "admin" ? "active" : ""} onClick={() => switchRole("admin")} type="button">Admin</button>
          <button className={role === "user" ? "active" : ""} onClick={() => switchRole("user")} type="button">User</button>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          {showRegister && role === "user" && (
            <>
              <Input
                label="Full Name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Enter your full name"
              />
              <Input
                label="Username"
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </>
          )}

          <Input
            label={showRegister ? "Email Address" : "Enter your email or username"}
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={showRegister ? "you@example.com" : "Enter your email or username"}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={showRegister ? "Create a password (min. 8 characters)" : "Enter your password"}
          />

          {showRegister && role === "user" && (
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
          )}

          {error && <div className="error-message" role="alert">{error}</div>}

          <button className="btn primary login-button" type="submit">
            {showRegister ? "Create Account" : `Sign in as ${role === "admin" ? "Admin" : "User"}`}
          </button>
        </form>

        {role === "user" && (
          <div style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
            {showRegister ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setShowRegister((current) => !current)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--accent, #8b1e2d)", fontWeight: 700, cursor: "pointer", font: "inherit" }}
            >
              {showRegister ? "Sign in" : "Register"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePage({ session, name, setName, username, setUsername, email, setEmail, message, onSave }) {
  const initials = (name || session?.name || "U").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = session?.role === "admin" ? "Administrator" : "Library Member";

  return (
    <section className="page-section profile-page">
      <style>{`
        .profile-page { width: 100%; max-width: 1120px; margin: 0 auto; }
        .profile-page .profile-intro { margin: 0 0 24px; }
        .profile-page .profile-intro .eyebrow { margin: 0 0 8px; letter-spacing: .16em; }
        .profile-page .profile-intro h2 { margin: 0; font-size: clamp(28px, 3vw, 36px); line-height: 1.15; }
        .profile-page .profile-intro p:last-child { margin: 10px 0 0; max-width: 620px; line-height: 1.65; color: var(--muted, #a7a9b8); font-size: 14px; }
        .profile-page .profile-layout { display: grid; grid-template-columns: minmax(230px, .72fr) minmax(0, 1.5fr); gap: 22px; align-items: start; }
        .profile-page .profile-summary, .profile-page .profile-form-card { min-width: 0; border: 1px solid var(--border, #353642); border-radius: 20px; background: var(--panel, #1d1e26); }
        .profile-page .profile-summary { padding: 26px 22px; text-align: center; }
        .profile-page .profile-avatar { width: 84px; height: 84px; border-radius: 24px; display: grid; place-items: center; margin: 0 auto 16px; background: linear-gradient(145deg, var(--accent, #bd354e), #852238); color: #fff; font-size: 27px; font-weight: 800; box-shadow: 0 10px 28px #0002; }
        .profile-page .profile-summary h3 { margin: 0; font-size: 19px; line-height: 1.35; overflow-wrap: anywhere; }
        .profile-page .profile-summary .profile-email { margin: 8px 0 16px; color: var(--muted, #a7a9b8); font-size: 13px; overflow-wrap: anywhere; }
        .profile-page .profile-role-pill { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--border, #353642); background: var(--surface, #24252f); border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 650; }
        .profile-page .profile-summary-note { margin: 20px 0 0; padding-top: 16px; border-top: 1px solid var(--border, #353642); text-align: left; color: var(--muted, #a7a9b8); font-size: 12px; line-height: 1.6; }
        .profile-page .profile-form-card { padding: clamp(20px, 3vw, 30px); }
        .profile-page .profile-form-heading { margin-bottom: 24px; }
        .profile-page .profile-form-heading h3 { margin: 0 0 6px; font-size: 20px; }
        .profile-page .profile-form-heading p { margin: 0; color: var(--muted, #a7a9b8); font-size: 13px; line-height: 1.55; }
        .profile-page .profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 18px; }
        .profile-page .profile-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .profile-page .profile-field.profile-field-wide { grid-column: 1 / -1; }
        .profile-page .profile-field > span { font-size: 13px; font-weight: 650; }
        .profile-page .profile-field input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 46px; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--border, #41424e); background: var(--input-bg, #171820); color: var(--text, #f7f7fb); font: inherit; font-size: 14px; outline: none; transition: border-color .18s, box-shadow .18s; }
        .profile-page .profile-field input:focus { border-color: var(--accent, #bd354e); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #bd354e) 20%, transparent); }
        .profile-page .profile-field small { color: var(--muted, #a7a9b8); font-size: 11px; line-height: 1.45; }
        .profile-page .profile-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--border, #353642); }
        .profile-page .profile-save-btn { min-height: 44px; padding: 0 20px; border: 0; border-radius: 11px; cursor: pointer; font-weight: 700; }
        .profile-page .profile-save-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent, #bd354e) 45%, transparent); outline-offset: 3px; }
        .profile-page .profile-role-note { color: var(--muted, #a7a9b8); font-size: 12px; line-height: 1.5; }
        .profile-page .profile-status { margin: 18px 0 0; padding: 12px 14px; border-radius: 10px; background: var(--surface, #24252f); border: 1px solid var(--border, #353642); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
        @media (max-width: 800px) { .profile-page .profile-layout { grid-template-columns: 1fr; } .profile-page .profile-summary { display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 18px; align-items: center; text-align: left; } .profile-page .profile-avatar { grid-row: span 2; margin: 0; width: 68px; height: 68px; border-radius: 20px; } .profile-page .profile-summary h3 { align-self: end; } .profile-page .profile-summary .profile-email { margin: 4px 0 0; } .profile-page .profile-role-pill { grid-column: 1 / -1; justify-self: start; margin-top: 16px; } .profile-page .profile-summary-note { grid-column: 1 / -1; width: 100%; box-sizing: border-box; } }
        @media (max-width: 520px) { .profile-page .profile-fields { grid-template-columns: 1fr; } .profile-page .profile-field.profile-field-wide { grid-column: auto; } .profile-page .profile-form-footer { align-items: stretch; flex-direction: column; } .profile-page .profile-save-btn { width: 100%; } }
      `}</style>
      <div className="profile-intro">
        <p className="eyebrow">ACCOUNT SETTINGS</p>
        <h2>My Profile</h2>
        <p>Manage your personal details and review the account you’re signed in with.</p>
      </div>
      <div className="profile-layout">
        <aside className="profile-summary">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <h3>{name || session?.name || "Your account"}</h3>
          <p className="profile-email">{email || "No email available"}</p>
          <span className="profile-role-pill"><span aria-hidden="true">●</span>{roleLabel}</span>
          <p className="profile-summary-note">Your role is managed by BookHaven and can’t be changed from this page.</p>
        </aside>
        <div className="profile-form-card">
          <div className="profile-form-heading">
            <h3>Personal information</h3>
            <p>Keep your profile details up to date. Fields marked as required must be filled in.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
            <div className="profile-fields">
              <label className="profile-field">
                <span>Full name <b aria-hidden="true">*</b></span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" autoComplete="name" required />
              </label>
              <label className="profile-field">
                <span>Username</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username not available" autoComplete="username" />
                <small>If your username is missing, it may not be included in the server’s login response.</small>
              </label>
              <label className="profile-field profile-field-wide">
                <span>Email address <b aria-hidden="true">*</b></span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" autoComplete="email" required />
              </label>
            </div>
            <div className="profile-form-footer">
              <button className="btn primary-btn profile-save-btn" type="submit">Save changes</button>
              <span className="profile-role-note">Account type: {session?.role === "admin" ? "Admin" : "User"} · Read-only</span>
            </div>
            {message && <p className="profile-status" role="status">{message}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}

function pageTitle(page) {
  const titles = {
    profile: "My Profile",
    books: "Book Collection",
    ebooks: "E-Books Library",
    members: "Members",
    issue: "Issue & Return",
    history: "Activity Timeline",
    recommendations: "For You",
    waiting: "Waiting Queue",
  };

  return titles[page] || "Dashboard";
}



function EbooksPage({ role }) {
  const [ebooks, setEbooks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("All");
  const [form, setForm] = React.useState({
    title: "",
    author: "",
    category: "",
    description: "",
  });
  const [file, setFile] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  // Keep the existing backend API.
  const API = "http://127.0.0.1:5000";

  async function loadEbooks() {
    try {
      setError("");
      const response = await fetch(`${API}/api/ebooks`);

      if (!response.ok) {
        throw new Error("Could not load e-books.");
      }

      const data = await response.json();
      setEbooks(Array.isArray(data) ? data : []);
    } catch {
      setError(
        "Unable to load e-books. Check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadEbooks();
  }, []);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (role !== "admin") return;

    if (!file || file.type !== "application/pdf") {
      setMessage("Please choose a valid PDF file.");
      return;
    }

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("author", form.author.trim());
    data.append("category", form.category.trim());
    data.append("description", form.description.trim());
    data.append("file", file);
    data.append("role", role);

    try {
      setUploading(true);
      setMessage("");

      const response = await fetch(`${API}/api/ebooks`, {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      setMessage("E-book uploaded successfully!");

      setForm({
        title: "",
        author: "",
        category: "",
        description: "",
      });
      setFile(null);

      if (event.target instanceof HTMLFormElement) {
        event.target.reset();
      }

      await loadEbooks();
    } catch (err) {
      setMessage(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const categories = [
    "All",
    ...new Set(
      ebooks.map((book) => book.category?.trim()).filter(Boolean)
    ),
  ];

  const filteredEbooks = ebooks.filter((book) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      book.title,
      book.author,
      book.category,
      book.description,
    ].some((value) => String(value || "").toLowerCase().includes(query));

    const matchesCategory =
      category === "All" || book.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <section className="ebooks-page">
      <div className="ebooks-hero">
        <div className="ebooks-hero-content">
          <span className="ebooks-eyebrow">
            YOUR DIGITAL READING SPACE
          </span>
          <h2>Discover your next read.</h2>
          <p>
            Explore your library's digital collection, all in one place.
          </p>

          <div className="ebooks-hero-stats">
            <div className="ebooks-stat">
              <span className="ebooks-stat-icon">▤</span>
              <div>
                <strong>{ebooks.length}</strong>
                <span>Digital books</span>
              </div>
            </div>
            <div className="ebooks-stat">
              <span className="ebooks-stat-icon">⌕</span>
              <div>
                <strong>{categories.length - 1}</strong>
                <span>Categories</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ebooks-hero-art" aria-hidden="true">
          <div className="ebooks-book ebooks-book-back">READ</div>
          <div className="ebooks-book ebooks-book-middle">EXPLORE</div>
          <div className="ebooks-book ebooks-book-front">
            <span>BH</span>
            <strong>BOOK<br />HAVEN</strong>
            <small>YOUR NEXT CHAPTER</small>
          </div>
        </div>
      </div>

      {role === "admin" && (
        <details className="ebooks-upload-panel">
          <summary>
            <span className="ebooks-upload-symbol">＋</span>
            <span className="ebooks-upload-heading">
              <strong>Add a new e-book</strong>
              <small>Upload a PDF to your digital collection</small>
            </span>
            <span className="ebooks-upload-toggle">＋</span>
          </summary>

          <form className="ebooks-form" onSubmit={handleUpload}>
            <div className="ebooks-form-grid">
              <label className="ebooks-field">
                <span>Book title *</span>
                <input
                  name="title"
                  placeholder="Enter the book title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="ebooks-field">
                <span>Author</span>
                <input
                  name="author"
                  placeholder="Author name"
                  value={form.author}
                  onChange={handleChange}
                />
              </label>

              <label className="ebooks-field">
                <span>Category</span>
                <input
                  name="category"
                  placeholder="e.g. Technology"
                  value={form.category}
                  onChange={handleChange}
                />
              </label>

              <label className="ebooks-field">
                <span>PDF file *</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                  required
                />
                <small>
                  {file ? file.name : "PDF format only"}
                </small>
              </label>

              <label className="ebooks-field ebooks-field-wide">
                <span>Description</span>
                <textarea
                  name="description"
                  placeholder="What is this book about?"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                />
              </label>
            </div>

            {message && (
              <p className="ebooks-feedback" role="status">{message}</p>
            )}

            <button
              className="ebooks-primary-button"
              type="submit"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "↑  Upload e-book"}
            </button>
          </form>
        </details>
      )}

      {role !== "admin" && (
        <div className="ebooks-member-note">
          <span>✦</span>
          Browse the collection and choose a book to start reading.
        </div>
      )}

      <div className="ebooks-collection-header">
        <div>
          <span className="ebooks-eyebrow">THE COLLECTION</span>
          <h3>Explore e-books</h3>
          <p>
            {loading
              ? "Loading your collection..."
              : `${filteredEbooks.length} ${
                  filteredEbooks.length === 1 ? "book" : "books"
                } to explore`}
          </p>
        </div>
      </div>

      <div className="ebooks-toolbar">
        <label className="ebooks-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search title, author or topic..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search e-books"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <label className="ebooks-category-select">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      {message && role !== "admin" && (
        <p className="ebooks-feedback" role="status">{message}</p>
      )}

      {error && (
        <div className="ebooks-state ebooks-error">
          <span>!</span>
          <h3>Collection unavailable</h3>
          <p>{error}</p>
          <button
            className="ebooks-secondary-button"
            onClick={loadEbooks}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="ebooks-state">
          <div className="ebooks-loader" />
          <p>Preparing your digital library...</p>
        </div>
      )}

      {!loading && !error && filteredEbooks.length === 0 && (
        <div className="ebooks-state">
          <span className="ebooks-empty-icon">▤</span>
          <h3>
            {ebooks.length === 0
              ? "Your collection starts here"
              : "No matching e-books"}
          </h3>
          <p>
            {ebooks.length === 0
              ? role === "admin"
                ? "Use the upload panel above to add your first PDF."
                : "Your library has not added any e-books yet."
              : "Try another search term or select a different category."}
          </p>
          {(search || category !== "All") && (
            <button
              className="ebooks-secondary-button"
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredEbooks.length > 0 && (
        <div className="ebooks-grid">
          {filteredEbooks.map((ebook, index) => (
            <article className="ebooks-card" key={ebook.id}>
              <div className={`ebooks-cover ebooks-cover-${index % 5}`}>
                <span className="ebooks-cover-label">BOOKHAVEN DIGITAL</span>
                <div className="ebooks-cover-art" aria-hidden="true">
                  {["✦", "◈", "▤", "⌘", "✳"][index % 5]}
                </div>
                <strong>{ebook.title}</strong>
                <span className="ebooks-cover-author">
                  {ebook.author || "Unknown author"}
                </span>
                <span className="ebooks-cover-bottom">E-BOOK  /  PDF</span>
              </div>

              <div className="ebooks-card-content">
                <span className="ebooks-category-tag">
                  {ebook.category || "General"}
                </span>
                <h4>{ebook.title}</h4>
                <p className="ebooks-card-author">
                  By {ebook.author || "Unknown author"}
                </p>
                {ebook.description && (
                  <p className="ebooks-card-description">
                    {ebook.description}
                  </p>
                )}

                <div className="ebooks-card-actions">
                  <a
                    className="ebooks-primary-button"
                    href={`${API}/api/ebooks/${ebook.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↗ Read PDF
                  </a>
                  <a
                    className="ebooks-download-button"
                    href={`${API}/api/ebooks/${ebook.id}/file?download=true`}
                  >
                    ↓
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Sidebar({ page, setPage, session, onLogout }) {
  const adminMenu = [
    { id: "dashboard", icon: "⌂", label: "Dashboard" },
    { id: "profile", icon: "◎", label: "My Profile" },
    { id: "books", icon: "▤", label: "Books" },
    { id: "members", icon: "♙", label: "Members" },
    { id: "issue", icon: "↔", label: "Issue / Return" },
    { id: "waiting", icon: "⌛", label: "Waiting Queue" },
    { id: "history", icon: "◷", label: "Activity" },
    { id: "recommendations", icon: "✦", label: "For You" },
    { id: "ebooks", icon: "📚", label: "E-books" },
  ];

  const userMenu = [
    { id: "dashboard", icon: "⌂", label: "Dashboard" },
    { id: "profile", icon: "◎", label: "My Profile" },
    { id: "books", icon: "▤", label: "Browse Books" },
    { id: "waiting", icon: "⌛", label: "My Queue" },
    { id: "history", icon: "◷", label: "My Activity" },
    { id: "recommendations", icon: "✦", label: "For You" },
    { id: "ebooks", icon: "📚", label: "E-books" },
  ];

  const menu =
    session?.role === "admin" ? adminMenu : userMenu;

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
            type="button"
            className={`nav-item ${
              page === item.id ? "active" : ""
            }`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="side-profile">
          <div className="avatar">
            {session?.name
              ?.split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>

          <div>
            <strong>{session?.name}</strong>
            <span>
              {session?.role === "admin"
                ? "Administrator"
                : "Member"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="logout-btn"
          onClick={onLogout}
        >
          ↪ <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}


function AdminDashboard({ books, members, loans, activities, waiting, setPage, onIssue, onMarkFinePaid }) {
  const activeLoans = loans.filter((loan) => loan.status === "Active");
  const overdueLoans = activeLoans.filter((loan) => getDaysOverdue(loan.dueDate) > 0);
  const pendingFineLoans = loans.filter((loan) => !loan.finePaid && getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date()) > 0);
  const totalPendingFine = pendingFineLoans.reduce((sum, loan) => sum + getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date()), 0);
  const availableCopies = books.reduce((sum, book) => sum + book.copies, 0);
  const totalCopies = books.reduce((sum, book) => sum + book.copies, 0) + activeLoans.length;

  return (
    <div className="page-content">
      <div className="welcome-banner">
        <div><span className="banner-tag">ADMIN CONTROL CENTER</span><h2>Run the entire library from one workspace.</h2><p>Monitor books, members, loans, overdue items, fines and waiting requests.</p></div>
        <button className="btn white-btn" onClick={onIssue}>+ Issue a Book</button>
      </div>
      <section className="stats-grid">
        <StatCard label="Total Titles" value={books.length} detail={`${totalCopies} copies in collection`} icon="▤" />
        <StatCard label="Available Copies" value={availableCopies} detail="Ready to borrow" icon="✓" />
        <StatCard label="Members" value={members.length} detail="Active members" icon="♙" />
        <StatCard label="Active Loans" value={activeLoans.length} detail="Currently issued" icon="↗" />
        <StatCard label="Overdue" value={overdueLoans.length} detail="Need attention" icon="!" />
        <StatCard label="Pending Fine" value={formatMoney(totalPendingFine)} detail={`${pendingFineLoans.length} unpaid item(s)`} icon="₹" />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">COLLECTION</p><h3>Popular books</h3></div><button className="text-button" onClick={() => setPage("books")}>View all →</button></div>
          <div className="book-list">{books.slice(0, 5).map((book) => <BookRow key={book.id} book={book} />)}</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">RECENT</p><h3>Latest activity</h3></div><button className="text-button" onClick={() => setPage("history")}>View all →</button></div>
          <ActivityList activities={activities.slice(0, 5)} />
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">ATTENTION</p><h3>Overdue & fine tracker</h3></div><span className="muted">₹{FINE_PER_DAY}/day</span></div>
          {pendingFineLoans.length === 0 ? <div className="empty-state">No pending fines. Great job!</div> : (
            <div className="activity-list">
              {pendingFineLoans.slice(0, 6).map((loan) => {
                const fine = getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date());
                return <div className="activity-item" key={loan.id}>
                  <div className="activity-icon issue">₹</div>
                  <div className="activity-content"><strong>{loan.bookTitle}</strong><p>{loan.memberName} · {loan.status === "Active" ? `${getDaysOverdue(loan.dueDate)} day(s) overdue` : "Returned with fine"}</p><span>{formatMoney(fine)}</span></div>
                  <button className="small-action" onClick={() => onMarkFinePaid(loan)}>Mark paid</button>
                </div>;
              })}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">QUEUE</p><h3>Waiting requests</h3></div><button className="text-button" onClick={() => setPage("waiting")}>Manage →</button></div>
          {waiting.length === 0 ? <div className="empty-state">No waiting requests.</div> : waiting.slice(0, 5).map((item, index) => (
            <div className="book-row" key={item.id}><div className="book-cover">{index + 1}</div><div className="book-row-info"><strong>{item.book}</strong><span>{item.member}</span></div><StatusBadge status="Queued" /></div>
          ))}
        </section>
      </div>
    </div>
  );
}

function UserDashboard({ books, loans, waiting, activities, session, recommendations, setPage }) {
  const myLoans = getUserLoans(loans, session);
  const activeLoans = myLoans.filter((loan) => loan.status === "Active");
  const overdueLoans = activeLoans.filter((loan) => getDaysOverdue(loan.dueDate) > 0);
  const dueSoon = activeLoans.filter((loan) => { const days = getDaysUntilDue(loan.dueDate); return days >= 0 && days <= 3; });
  const currentFine = myLoans.filter((loan) => !loan.finePaid).reduce((sum, loan) => sum + getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date()), 0);
  const myWaiting = waiting.filter((item) => item.memberId === session.memberId);
  const myActivities = activities.filter((activity) => activity.description?.includes(session.name));

  const notifications = [
    ...overdueLoans.map((loan) => ({ type: "danger", title: "Book overdue", text: `${loan.bookTitle} is ${getDaysOverdue(loan.dueDate)} day(s) overdue.` })),
    ...dueSoon.map((loan) => ({ type: "warning", title: "Due soon", text: `${loan.bookTitle} is due ${getDaysUntilDue(loan.dueDate) === 0 ? "today" : `in ${getDaysUntilDue(loan.dueDate)} day(s)`}.` })),
    ...myLoans.filter((loan) => !loan.finePaid && getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date()) > 0).map((loan) => ({ type: "danger", title: "Fine pending", text: `${formatMoney(getFine(loan.dueDate, loan.status === "Returned" ? loan.returnedDate : new Date()))} due for ${loan.bookTitle}.` })),
    ...myWaiting.filter((item) => waiting.filter((q) => q.bookId === item.bookId).findIndex((q) => q.id === item.id) === 0).map((item) => ({ type: "success", title: "You are next in queue", text: `${item.book} is your next waiting request.` })),
  ].slice(0, 5);

  return (
    <div className="page-content">
      <div className="welcome-banner">
        <div><span className="banner-tag">YOUR READING SPACE</span><h2>Everything you need to manage your reading.</h2><p>Track borrowed books, due dates, fines, queue requests and personalized recommendations.</p></div>
        <button className="btn white-btn" onClick={() => setPage("books")}>Browse Books</button>
      </div>
      <section className="stats-grid">
        <StatCard label="My Borrowed Books" value={activeLoans.length} detail="Currently with you" icon="▤" />
        <StatCard label="Due Soon" value={dueSoon.length} detail="Within 3 days" icon="◷" />
        <StatCard label="Overdue" value={overdueLoans.length} detail="Needs attention" icon="!" />
        <StatCard label="Current Fine" value={formatMoney(currentFine)} detail="Calculated automatically" icon="₹" />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">MY BOOKS</p><h3>Current loans</h3></div><button className="text-button" onClick={() => setPage("history")}>History →</button></div>
          {activeLoans.length === 0 ? <div className="empty-state">You have no active loans. Browse the collection to find your next book.</div> : activeLoans.map((loan) => {
            const days = getDaysUntilDue(loan.dueDate); const overdue = days < 0;
            return <div className="book-row" key={loan.id}><div className="book-cover">{loan.bookTitle[0]}</div><div className="book-row-info"><strong>{loan.bookTitle}</strong><span>{loan.author}</span></div><div><small>{overdue ? "Overdue" : days === 0 ? "Due today" : `Due in ${days} day(s)`}</small><br /><strong>{formatDate(loan.dueDate)}</strong></div><StatusBadge status={overdue ? "Overdue" : "Active"} /></div>;
          })}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">NOTIFICATIONS</p><h3>Stay on track</h3></div><span className="muted">{notifications.length} alert(s)</span></div>
          {notifications.length === 0 ? <div className="empty-state">You're all caught up. No urgent notifications.</div> : notifications.map((item, index) => <div className="activity-item" key={index}><div className={`activity-icon ${item.type === "danger" ? "issue" : "return"}`}>{item.type === "success" ? "✓" : "!"}</div><div className="activity-content"><strong>{item.title}</strong><p>{item.text}</p></div></div>)}
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">SMART RECOMMENDATIONS</p><h3>Picked for you</h3></div><button className="text-button" onClick={() => setPage("recommendations")}>View all →</button></div>
          <div className="book-list">{recommendations.slice(0, 3).map((book) => <BookRow key={book.id} book={book} />)}</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">READING INSIGHTS</p><h3>Your library activity</h3></div></div>
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", margin: 0 }}>
            <StatCard label="Total Borrowed" value={myLoans.length} detail="Including returned" icon="↗" />
            <StatCard label="Queue Requests" value={myWaiting.length} detail="Waiting list" icon="⌛" />
          </div>
          <div style={{ marginTop: 18 }}><strong>Recent activity</strong>{myActivities.length === 0 ? <p className="muted">No personal activity yet.</p> : <ActivityList activities={myActivities.slice(0, 3)} />}</div>
        </section>
      </div>
    </div>
  );
}


function BooksPage({ books, search, setSearch, sortBy, setSortBy, isAdmin, onAddBook, onIssue, loans, onReturn, waiting, session, onJoinQueue }) {
  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div><p className="eyebrow">COLLECTION</p><h2>{isAdmin ? "Books" : "Browse Books"}</h2><p className="muted">{isAdmin ? "Manage your library collection and lending." : "Search the collection and join a waiting queue when a book is unavailable."}</p></div>
        {isAdmin && <div className="toolbar-actions"><button className="btn secondary" onClick={onAddBook}>+ Add Book</button><button className="btn primary" onClick={onIssue}>+ Issue Book</button></div>}
      </div>
      <div className="toolbar-controls">
        <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, author, category or ISBN..." /></div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="title">Sort by Title</option><option value="author">Sort by Author</option><option value="category">Sort by Category</option><option value="status">Sort by Status</option></select>
      </div>
      <div className="table-card">
        <table><thead><tr><th>Book</th><th>Category</th><th>ISBN</th><th>Copies</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{books.map((book) => {
            const activeLoan = loans.find((loan) => loan.bookId === book.id && loan.status === "Active");
            const queued = session?.role === "user" && waiting.some((item) => item.bookId === book.id && item.memberId === session.memberId);
            return <tr key={book.id}>
              <td><div className="table-book"><div className="book-cover">{book.title[0]}</div><div><strong>{book.title}</strong><span>{book.author}</span></div></div></td>
              <td>{book.category}</td><td>{book.isbn}</td><td>{book.copies}</td><td><StatusBadge status={book.status} /></td>
              <td>{isAdmin ? (book.copies > 0 ? <button className="small-action" onClick={onIssue}>Issue</button> : activeLoan ? <button className="small-action" onClick={() => onReturn(activeLoan)}>Return</button> : <span>Unavailable</span>) : (book.copies > 0 ? <span className="muted">Available</span> : queued ? <span className="muted">Queued ✓</span> : <button className="small-action" onClick={() => onJoinQueue(book)}>Join Queue</button>)}</td>
            </tr>;
          })}</tbody>
        </table>
        {books.length === 0 && <div className="empty-state">No books found for your search.</div>}
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



function HistoryPage({ activities, session }) {
  const visible = session?.role === "admin" ? activities : activities.filter((activity) => activity.description?.includes(session?.name));
  return (
    <div className="page-content">
      <div className="page-toolbar"><div><p className="eyebrow">ACTIVITY</p><h2>{session?.role === "admin" ? "Activity Timeline" : "My Activity"}</h2><p className="muted">{session?.role === "admin" ? "A complete record of library operations." : "Your personal borrowing and queue activity."}</p></div></div>
      <section className="panel timeline-panel"><ActivityList activities={visible} timeline /></section>
    </div>
  );
}


function Recommendations({ books }) {
  return (
    <div className="page-content">
      <div className="page-toolbar"><div><p className="eyebrow">PERSONALIZED</p><h2>Recommended for You</h2><p className="muted">Recommendations prioritize books from categories you have already borrowed, followed by other available titles.</p></div></div>
      <div className="recommendation-grid">
        {books.map((book) => <div className="recommendation-card" key={book.id}><div className="large-cover">{book.title[0]}</div><div><span className="category-label">{book.category}</span><h3>{book.title}</h3><p>{book.author}</p><StatusBadge status={book.status} /></div></div>)}
      </div>
      {books.length === 0 && <div className="empty-state">No recommendations available right now.</div>}
    </div>
  );
}

function WaitingPage({ waiting, session, onRemove }) {
  const visible = session?.role === "admin" ? waiting : waiting.filter((item) => item.memberId === session?.memberId);
  return (
    <div className="page-content">
      <div className="page-toolbar"><div><p className="eyebrow">QUEUE MANAGEMENT</p><h2>{session?.role === "admin" ? "Waiting Queue" : "My Waiting Queue"}</h2><p className="muted">Requests are handled in first-come, first-served order.</p></div><div className="count-large">{visible.length} request(s)</div></div>
      <section className="panel">
        {visible.length === 0 ? <div className="empty-state">No pending waiting requests.</div> : <div className="waiting-list">{visible.map((item) => { const position = waiting.filter((q) => q.bookId === item.bookId).findIndex((q) => q.id === item.id) + 1; return <div className="waiting-row" key={item.id}><div className="position">{position}</div><div className="waiting-avatar">{item.member.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div><div className="waiting-main"><strong>{item.member}</strong><span>Requested <b>{item.book}</b></span></div><div className="request-date">{item.requestedOn}</div><button className="icon-danger" onClick={() => onRemove(item.id)}>×</button></div>; })}</div>}
      </section>
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
  let statusClass = "available";
  if (["Issued", "Overdue"].includes(status)) statusClass = "issued";
  return <span className={`status ${statusClass}`}><i></i>{status}</span>;
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

export default App;