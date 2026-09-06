import { useEffect, useState } from "react";
import "./App.css";

type View = "overview" | "clients" | "projects" | "tasks" | "invoices" | "team";
type Stats = {
  clients: number;
  projects: number;
  tasks: number;
  invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
};
type User = {
  id?: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "employee";
};
type Client = {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string;
};
type Invoice = {
  id: number;
  client_id: number;
  number: string;
  amount: string;
  status: string;
  due_date?: string;
  client?: Client;
};
type Project = {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  client?: Client;
  status: string;
  due_date?: string;
};
type Task = {
  id: number;
  title: string;
  description?: string;
  project?: Project;
  priority: string;
  status: string;
  assigned_to?: number;
  assignee?: User;
  due_date?: string;
};
type SearchResult = {
  type: Exclude<View, "overview">;
  id: number;
  title: string;
  detail: string;
};
type DashboardStats = Stats & {
  recent_projects: Project[];
  pending_tasks: Task[];
};
const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "clients", label: "Clients", icon: "◌" },
  { id: "projects", label: "Projects", icon: "⌁" },
  { id: "tasks", label: "Tasks", icon: "✓" },
  { id: "invoices", label: "Invoices", icon: "▤" },
];

type Theme = "light" | "dark";

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      <span className="theme-toggle-label">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("focal_theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [view, setView] = useState<View>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    projects: 0,
    tasks: 0,
    invoices: 0,
    paid_invoices: 0,
    overdue_invoices: 0,
    recent_projects: [],
    pending_tasks: [],
  });
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("focal_token")),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("focal_theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!loggedIn) {
      setUser(null);
      setStats({
        clients: 0,
        projects: 0,
        tasks: 0,
        invoices: 0,
        paid_invoices: 0,
        overdue_invoices: 0,
        recent_projects: [],
        pending_tasks: [],
      });
      setSearch("");
      setSearchResults([]);
    }
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${localStorage.getItem("focal_token")}`,
    };
    Promise.all([
      fetch("/api/user", { headers }),
      fetch("/api/dashboard", { headers }),
    ])
      .then(async ([userResponse, statsResponse]) => {
        if (!userResponse.ok) {
          localStorage.removeItem("focal_token");
          setSessionMessage("Your session has expired. Please sign in again.");
          setLoggedIn(false);
          return;
        }
        setUser(await userResponse.json());
        if (statsResponse.ok) setStats(await statsResponse.json());
      })
      .catch(() => setSessionMessage("The API is unavailable. Start Laravel, then try again."));
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn || search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${localStorage.getItem("focal_token")}`,
    };
    Promise.all(
      ["clients", "projects", "tasks", "invoices"].map((type) =>
        fetch(`/api/${type}`, { headers }).then((response) => response.json()),
      ),
    )
      .then(([clientData, projectData, taskData, invoiceData]) => {
        const query = search.toLowerCase();
        setSearchResults(
          [
            ...(clientData.data || []).map((item: Client) => ({
              type: "clients" as const,
              id: item.id,
              title: item.name,
              detail: item.company || "Client",
            })),
            ...(projectData.data || []).map((item: Project) => ({
              type: "projects" as const,
              id: item.id,
              title: item.name,
              detail: item.status,
            })),
            ...(taskData.data || []).map((item: Task) => ({
              type: "tasks" as const,
              id: item.id,
              title: item.title,
              detail: item.priority,
            })),
            ...(invoiceData.data || []).map((item: Invoice) => ({
              type: "invoices" as const,
              id: item.id,
              title: item.number,
              detail: `$${Number(item.amount).toLocaleString()}`,
            })),
          ]
            .filter((item) =>
              `${item.title} ${item.detail}`.toLowerCase().includes(query),
            )
            .slice(0, 8),
        );
      })
      .catch(() => setSearchResults([]));
  }, [loggedIn, search]);
  const [authBusy, setAuthBusy] = useState(false);
  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const response = await fetch(`/api/${authMode}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? { name, email, password, password_confirmation: password }
            : { email, password },
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token || !data.user) {
        setAuthError(data.message || "Sign-in failed. Check your details and try again.");
        return;
      }
      localStorage.setItem("focal_token", data.token);
      setUser(data.user);
      setEmail("");
      setPassword("");
      setName("");
      setSearch("");
      setSearchResults([]);
      setSessionMessage("");
      setView("overview");
      setLoggedIn(true);
    } catch {
      setAuthError("The API is unavailable. Start Laravel, then try again.");
    } finally {
      setAuthBusy(false);
    }
  };
  const logout = async () => {
    const token = localStorage.getItem("focal_token");
    try {
      if (token) {
        await fetch("/api/logout", {
          method: "POST",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      localStorage.removeItem("focal_token");
      setSessionMessage("You have been signed out.");
      setLoggedIn(false);
    }
  };
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  document.body.dataset.role = user?.role || "";
  if (!loggedIn)
    return (
      <main className="auth">
        <div className="auth-card">
          <div className="auth-topbar">
            <div className="brand">
              <span>F</span>
              <strong>Focal</strong>
            </div>
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "light" ? "dark" : "light")} />
          </div>
          <div className="auth-intro">
            <p className="eyebrow">BUSINESS COMMAND CENTER</p>
            <h1>
              {authMode === "login" ? (
                <>
                  Welcome
                  <br />
                  <em>back.</em>
                </>
              ) : (
                <>
                  Build your
                  <br />
                  <em>workspace.</em>
                </>
              )}
            </h1>
            <p className="muted">
              {authMode === "login"
                ? "Sign in to pick up where your team left off."
                : "Bring clients, projects, tasks, and invoices into one calm place."}
            </p>
          </div>
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setPassword("");
              }}
            >
              Sign in
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
                setPassword("");
              }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submitAuth}>
            {authMode === "register" && (
              <label>
                Your name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "◉" : "◌"}
                </button>
              </div>
            </label>
            {(authError || sessionMessage) && <small className="error">{authError || sessionMessage}</small>}
            <button className="primary" disabled={authBusy}>
              {authBusy
                ? "Connecting..."
                : authMode === "login"
                  ? "Enter workspace"
                  : "Create workspace"}{" "}
              <span>→</span>
            </button>
          </form>
          <small className="auth-note">
            Your account role is managed by the workspace owner.
          </small>
        </div>
        <div className="auth-art">
          <div className="art-note">
            THE WEEK AHEAD <b>+18.4%</b>
          </div>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-copy">
            <span>FOCAL / 01</span>
            <strong>
              Clarity
              <br />
              creates
              <br />
              <i>momentum.</i>
            </strong>
          </div>
        </div>
      </main>
    );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span>F</span>
          <strong>Focal</strong>
        </div>
        <p className="side-label">WORKSPACE</p>
        <nav>
          {nav
            .filter((item) => item.id !== "team" || user?.role === "owner")
            .map((item) => (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => setView(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          {user?.role === "owner" && (
            <button
              className={view === "team" ? "active" : ""}
              onClick={() => setView("team")}
            >
              <span>◎</span>Team
            </button>
          )}
        </nav>
        <div className="side-bottom">
          <div className="upgrade">
            <small>FOCAL PRO</small>
            <b>
              Build with
              <br />
              less noise.
            </b>
            <button>Explore plan ↗</button>
          </div>
          <button
            className="profile"
            onClick={logout}
          >
            <span className="avatar">{user?.name[0]?.toUpperCase()}</span>
            <span>
              <b>{user?.name}</b>
              <small>{user?.role} · Sign out</small>
            </span>
            <span>•••</span>
          </button>
        </div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">THURSDAY, SEPTEMBER 03, 2026</p>
            <h1>
              {view === "overview" ? (
                <>
                  Good morning, <em>{user?.name.split(" ")[0]}.</em>
                </>
              ) : view === "team" ? (
                "Team"
              ) : (
                nav.find((item) => item.id === view)?.label
              )}
            </h1>
            <p className="role-label">{user?.role} workspace</p>
          </div>
          <div className="header-tools">
            <div className="search-wrap">
              <input
                className="global-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspace..."
              />
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        setView(result.type);
                        setSearch("");
                      }}
                    >
                      <b>{result.title}</b>
                      <small>
                        {result.type} · {result.detail}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "light" ? "dark" : "light")} />
            <button className="bell">
              ⌁<i />
            </button>
          </div>
        </header>
        {view === "overview" ? (
          <Overview stats={stats} onNavigate={setView} />
        ) : view === "team" ? (
          <TeamView currentUser={user} />
        ) : (
          <ListView view={view} search={search} />
        )}
      </section>
    </div>
  );
}
function Overview({
  stats,
  onNavigate,
}: {
  stats: DashboardStats;
  onNavigate: (v: View) => void;
}) {
  const cards: [keyof Stats, string, View][] = [
    ["clients", "Active clients", "clients"],
    ["projects", "Open projects", "projects"],
    ["tasks", "Tasks in motion", "tasks"],
    ["invoices", "Revenue tracked", "invoices"],
  ];
  return (
    <>
      <div className="hero-row">
        <p className="muted">Live totals from your Focal workspace.</p>
        <button
          className="primary compact"
          onClick={() => onNavigate("clients")}
        >
          ＋ Add client
        </button>
      </div>
      <div className="stats">
        {cards.map(([key, label, target]) => (
          <button className="stat" key={key} onClick={() => onNavigate(target)}>
            <span>{label}</span>
            <strong>
              {key === "invoices"
                ? `$${Number(stats[key]).toLocaleString()}`
                : stats[key]}
            </strong>
            <small>
              Current total <i>from database</i>
            </small>
          </button>
        ))}
      </div>
      <div className="grid-two">
        <section className="panel focus">
          <div className="panel-head">
            <div>
              <p className="eyebrow">INVOICE STATUS</p>
              <h2>Payment health</h2>
            </div>
            <button onClick={() => onNavigate("invoices")}>
              View invoices ↗
            </button>
          </div>
          <div className="focus-item">
            <span className="dot green" />
            <div>
              <b>Paid invoices</b>
              <small>Money marked as paid</small>
            </div>
            <strong>${Number(stats.paid_invoices).toLocaleString()}</strong>
          </div>
          <div className="focus-item">
            <span className="dot red" />
            <div>
              <b>Overdue invoices</b>
              <small>Needs follow-up</small>
            </div>
            <strong>${Number(stats.overdue_invoices).toLocaleString()}</strong>
          </div>
        </section>
        <section className="panel pulse">
          <div className="panel-head">
            <div>
              <p className="eyebrow">WORKSPACE TOTALS</p>
              <h2>Actual revenue tracked</h2>
            </div>
          </div>
          <div className="revenue">
            <strong>${Number(stats.invoices).toLocaleString()}</strong>
            <span>All invoices</span>
          </div>
          <p className="muted">
            This total is calculated from your saved invoices. Create or update
            an invoice to change it.
          </p>
        </section>
      </div>
      <div className="grid-two dashboard-lists">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">RECENT PROJECTS</p>
              <h2>Latest work</h2>
            </div>
            <button onClick={() => onNavigate("projects")}>View all ↗</button>
          </div>
          {stats.recent_projects.length ? (
            stats.recent_projects.map((project) => (
              <div className="focus-item" key={project.id}>
                <span className="dot green" />
                <div>
                  <b>{project.name}</b>
                  <small>{project.client?.name || "No client"}</small>
                </div>
                <em>{project.status}</em>
              </div>
            ))
          ) : (
            <p className="muted empty-state">No projects yet.</p>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">PENDING TASKS</p>
              <h2>Needs attention</h2>
            </div>
            <button onClick={() => onNavigate("tasks")}>View all ↗</button>
          </div>
          {stats.pending_tasks.length ? (
            stats.pending_tasks.map((task) => (
              <div className="focus-item" key={task.id}>
                <span className="dot yellow" />
                <div>
                  <b>{task.title}</b>
                  <small>{task.assignee?.name || "Unassigned"}</small>
                </div>
                <em>{task.priority}</em>
              </div>
            ))
          ) : (
            <p className="muted empty-state">No pending tasks.</p>
          )}
        </section>
      </div>
    </>
  );
}
function TeamView({ currentUser }: { currentUser: User | null }) {
  const [members, setMembers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/team", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("focal_token")}`,
      },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Only workspace owners can manage the team.");
        setMembers(await response.json());
      })
      .catch((error) => setMessage(error.message));
  }, []);
  const updateRole = async (member: User, role: User["role"]) => {
    if (!member.id) return;
    const response = await fetch(`/api/team/${member.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("focal_token")}`,
      },
      body: JSON.stringify({ role }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message || "Unable to update role.");
      return;
    }
    setMembers(
      members.map((item) =>
        item.id === member.id ? { ...item, role: result.role } : item,
      ),
    );
    setMessage(`${member.name} is now a ${result.role}.`);
  };
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">OWNER CONTROLS</p>
          <h2>Manage workspace access</h2>
        </div>
        <span className="role-label">{members.length} members</span>
      </div>
      <p className="muted team-copy">
        Assign trusted people as managers or employees. New self-registered
        accounts remain employees until you change them here.
      </p>
      {message && <p className="form-message">{message}</p>}
      <div className="team-list">
        {members.map((member) => (
          <div className="team-row" key={member.id}>
            <span className="avatar">{member.name[0]?.toUpperCase()}</span>
            <div>
              <b>
                {member.name}
                {member.id === currentUser?.id ? " (you)" : ""}
              </b>
              <small>{member.email}</small>
            </div>
            <select
              value={member.role}
              disabled={member.id === currentUser?.id}
              onChange={(event) =>
                updateRole(member, event.target.value as User["role"])
              }
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
function ListView({ view, search }: { view: View; search: string }) {
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{
    type: "clients" | "invoices" | "projects" | "tasks";
    id: number;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    number?: string;
    amount?: string;
    status?: string;
    due_date?: string;
    client_id?: string;
    description?: string;
    assigned_to?: string;
    priority?: string;
  } | null>(null);
  const [client, setClient] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [invoice, setInvoice] = useState({
    client_id: "",
    number: "",
    amount: "",
    due_date: "",
  });
  const [project, setProject] = useState({
    client_id: "",
    name: "",
    status: "planning",
  });
  const [task, setTask] = useState({
    project_id: "",
    assigned_to: "",
    title: "",
    priority: "medium",
    status: "todo",
    due_date: "",
  });
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("focal_token")}`,
  };
  useEffect(() => {
    if (view === "clients")
      fetch("/api/clients", { headers })
        .then((response) => response.json())
        .then((data) => setClients(data.data || []))
        .catch(() => setMessage("Unable to load clients."));
    if (view === "invoices")
      Promise.all([
        fetch("/api/invoices", { headers }),
        fetch("/api/clients", { headers }),
      ])
        .then(async ([invoiceResponse, clientResponse]) => {
          const invoiceData = await invoiceResponse.json();
          const clientData = await clientResponse.json();
          setInvoices(invoiceData.data || []);
          setClients(clientData.data || []);
        })
        .catch(() => setMessage("Unable to load records."));
    if (view === "projects")
      Promise.all([
        fetch("/api/projects", { headers }),
        fetch("/api/clients", { headers }),
      ])
        .then(async ([projectResponse, clientResponse]) => {
          const projectData = await projectResponse.json();
          const clientData = await clientResponse.json();
          setProjects(projectData.data || []);
          setClients(clientData.data || []);
        })
        .catch(() => setMessage("Unable to load projects."));
    if (view === "tasks")
      Promise.all([
        fetch("/api/tasks", { headers }),
        fetch("/api/projects", { headers }),
        fetch("/api/team/assignees", { headers }),
      ])
        .then(async ([taskResponse, projectResponse, assigneeResponse]) => {
          const taskData = await taskResponse.json();
          const projectData = await projectResponse.json();
          const assigneeData = assigneeResponse.ok
            ? await assigneeResponse.json()
            : [];
          setTasks(taskData.data || []);
          setProjects(projectData.data || []);
          setAssignees(assigneeData);
        })
        .catch(() => setMessage("Unable to load tasks."));
  }, [view]);
  const createClient = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message || "Unable to create client.");
      return;
    }
    setClients([result, ...clients]);
    setClient({ name: "", company: "", email: "", phone: "" });
    setShowForm(false);
    setMessage("Client created successfully.");
  };
  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...invoice,
        client_id: Number(invoice.client_id),
        amount: Number(invoice.amount),
        status: "draft",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message || "Unable to create invoice.");
      return;
    }
    setInvoices([result, ...invoices]);
    setInvoice({ client_id: "", number: "", amount: "", due_date: "" });
    setShowForm(false);
    setMessage(`Invoice ${result.number} created successfully.`);
  };
  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...project,
        client_id: Number(project.client_id),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message || "Unable to create project.");
      return;
    }
    setProjects([result, ...projects]);
    setShowForm(false);
    setMessage("Project created successfully.");
  };
  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...task,
        project_id: Number(task.project_id),
        assigned_to: task.assigned_to ? Number(task.assigned_to) : null,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message || "Unable to create task.");
      return;
    }
    setTasks([result, ...tasks]);
    setTask({
      project_id: "",
      assigned_to: "",
      title: "",
      priority: "medium",
      status: "todo",
      due_date: "",
    });
    setShowForm(false);
    setMessage("Task created successfully.");
  };
  const deleteRecord = async (id: number) => {
    if (!window.confirm("Delete this record?")) return;
    const response = await fetch(`/api/${view}/${id}`, {
      method: "DELETE",
      headers,
    });
    if (response.ok) {
      if (view === "clients")
        setClients(clients.filter((item) => item.id !== id));
      if (view === "invoices")
        setInvoices(invoices.filter((item) => item.id !== id));
      if (view === "projects")
        setProjects(projects.filter((item) => item.id !== id));
      if (view === "tasks") setTasks(tasks.filter((item) => item.id !== id));
      setMenuId(null);
      setMessage("Record deleted.");
    }
  };
  const editRecord = (id: number, current: string) => {
    if (view === "clients") {
      const item = clients.find((clientItem) => clientItem.id === id);
      if (item)
        setEditing({
          type: "clients",
          id,
          name: item.name,
          company: item.company,
          email: item.email,
          phone: item.phone,
          status: item.status,
        });
    } else if (view === "invoices") {
      const item = invoices.find((invoiceItem) => invoiceItem.id === id);
      if (item)
        setEditing({
          type: "invoices",
          id,
          name: current,
          number: item.number,
          amount: item.amount,
          status: item.status,
          due_date: item.due_date,
        });
    } else if (view === "projects") {
      const item = projects.find((projectItem) => projectItem.id === id);
      if (item)
        setEditing({ type: "projects", id, name: item.name, client_id: String(item.client_id), description: item.description || "", status: item.status, due_date: item.due_date?.slice(0, 10) || "" });
    } else if (view === "tasks") {
      const item = tasks.find((taskItem) => taskItem.id === id);
      if (item)
        setEditing({ type: "tasks", id, name: item.title, assigned_to: item.assigned_to ? String(item.assigned_to) : "", description: item.description || "", priority: item.priority, status: item.status, due_date: item.due_date?.slice(0, 10) || "" });
    }
    setMenuId(null);
  };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const payload =
      editing.type === "clients"
        ? {
            name: editing.name,
            company: editing.company,
            email: editing.email,
            phone: editing.phone,
            status: editing.status,
          }
        : editing.type === "invoices" ? {
            number: editing.number,
            amount: Number(editing.amount),
            status: editing.status,
            due_date: editing.due_date,
          } : editing.type === "projects" ? {
            name: editing.name,
            description: editing.description,
            client_id: Number(editing.client_id),
            status: editing.status,
            due_date: editing.due_date || null,
          } : {
            title: editing.name,
            description: editing.description,
            assigned_to: editing.assigned_to ? Number(editing.assigned_to) : null,
            priority: editing.priority,
            status: editing.status,
            due_date: editing.due_date || null,
          };
    const response = await fetch(`/api/${editing.type}/${editing.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || "Unable to update record.");
      return;
    }
    const result = await response.json();
    if (editing.type === "clients")
      setClients(
        clients.map((item) => (item.id === editing.id ? result : item)),
      );
    else if (editing.type === "invoices")
      setInvoices(
        invoices.map((item) => (item.id === editing.id ? result : item)),
      );
    else if (editing.type === "projects")
      setProjects(projects.map((item) => item.id === editing.id ? { ...item, ...result, client: clients.find((client) => client.id === result.client_id) } : item));
    else
      setTasks(tasks.map((item) => item.id === editing.id ? { ...item, ...result, assignee: assignees.find((assignee) => assignee.id === result.assigned_to) } : item));
    setEditing(null);
    setMessage("Record updated successfully.");
  };
  const rows =
    view === "clients"
      ? clients
          .filter((item) =>
            `${item.name} ${item.company} ${item.email}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((item) => ({
            id: item.id,
            cells: [item.name, item.company || "No company", item.status],
            name: item.name,
          }))
      : view === "invoices"
        ? invoices
            .filter((item) =>
              `${item.number} ${item.client?.name} ${item.status}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((item) => ({
              id: item.id,
              cells: [
                item.number,
                item.client?.name || `Client #${item.client_id}`,
                `$${Number(item.amount).toLocaleString()}`,
                item.status,
              ],
              name: item.number,
            }))
        : view === "projects"
          ? projects
              .filter((item) =>
                `${item.name} ${item.client?.name} ${item.status}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((item) => ({
                id: item.id,
                cells: [
                  item.name,
                  item.client?.name || "No client",
                  item.status,
                ],
                name: item.name,
              }))
          : view === "tasks"
            ? tasks
                .filter((item) =>
                  `${item.title} ${item.project?.name} ${item.priority}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((item) => ({
                  id: item.id,
                  cells: [
                    item.title,
                    item.project?.name || "No project",
                    item.assignee?.name ||
                      (assignees.length ? "Unassigned" : "No team"),
                    item.priority,
                  ],
                  name: item.title,
                }))
            : [];
  const role = (document.body.dataset.role || "employee") as User["role"];
  const canCreate =
    role !== "employee" &&
    ["clients", "invoices", "projects", "tasks"].includes(view);
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">WORKSPACE DATA</p>
          <h2>Manage your {view}</h2>
        </div>
        {canCreate && (
          <button
            className="primary compact"
            onClick={() => setShowForm(!showForm)}
          >
            ＋ New {view.slice(0, -1)}
          </button>
        )}
      </div>
      {showForm && view === "clients" && (
        <form className="inline-form" onSubmit={createClient}>
          <input
            required
            placeholder="Name"
            value={client.name}
            onChange={(e) => setClient({ ...client, name: e.target.value })}
          />
          <input
            placeholder="Company"
            value={client.company}
            onChange={(e) => setClient({ ...client, company: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            value={client.email}
            onChange={(e) => setClient({ ...client, email: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={client.phone}
            onChange={(e) => setClient({ ...client, phone: e.target.value })}
          />
          <button className="primary">Create</button>
        </form>
      )}
      {showForm && view === "invoices" && (
        <form className="inline-form" onSubmit={createInvoice}>
          <select
            required
            value={invoice.client_id}
            onChange={(e) =>
              setInvoice({ ...invoice, client_id: e.target.value })
            }
          >
            <option value="">Choose client</option>
            {clients.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Invoice number"
            value={invoice.number}
            onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={invoice.amount}
            onChange={(e) => setInvoice({ ...invoice, amount: e.target.value })}
          />
          <input
            type="date"
            value={invoice.due_date}
            onChange={(e) =>
              setInvoice({ ...invoice, due_date: e.target.value })
            }
          />
          <button className="primary">Create</button>
        </form>
      )}
      {showForm && view === "projects" && (
        <form className="inline-form" onSubmit={createProject}>
          <select
            required
            value={project.client_id}
            onChange={(e) =>
              setProject({ ...project, client_id: e.target.value })
            }
          >
            <option value="">Choose client</option>
            {clients.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Project name"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
          />
          <select
            value={project.status}
            onChange={(e) => setProject({ ...project, status: e.target.value })}
          >
            <option>planning</option>
            <option>active</option>
            <option>on_hold</option>
            <option>completed</option>
          </select>
          <span />
          <button className="primary">Create</button>
        </form>
      )}
      {showForm && view === "tasks" && (
        <form className="inline-form" onSubmit={createTask}>
          <select
            required
            value={task.project_id}
            onChange={(e) => setTask({ ...task, project_id: e.target.value })}
          >
            <option value="">Choose project</option>
            {projects.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Task title"
            value={task.title}
            onChange={(e) => setTask({ ...task, title: e.target.value })}
          />
          <select
            value={task.priority}
            onChange={(e) => setTask({ ...task, priority: e.target.value })}
          >
            <option>low</option>
            <option>medium</option>
            <option>high</option>
          </select>
          <select
            value={task.status}
            onChange={(e) => setTask({ ...task, status: e.target.value })}
          >
            <option>todo</option>
            <option>in_progress</option>
            <option>done</option>
          </select>
          <button className="primary">Create</button>
        </form>
      )}
      {message && <p className="form-message">{message}</p>}
      <div className="table">
        {rows.map((row) => (
          <div className="table-row" key={row.id}>
            {row.cells.map((cell, cellIndex) => (
              <span
                key={cellIndex}
                className={cellIndex === row.cells.length - 1 ? "tag" : ""}
              >
                {cell}
              </span>
            ))}
            <div className="row-actions">
              <button
                onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                aria-label="Open record actions"
              >
                •••
              </button>
              {menuId === row.id && (
                <div className="action-menu">
                  <button onClick={() => editRecord(row.id, row.name)}>
                    Edit
                  </button>
                  <button onClick={() => deleteRecord(row.id)}>Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <form className="edit-modal" onSubmit={saveEdit}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">EDIT RECORD</p>
                <h2>
                  {editing.type === "clients"
                    ? "Edit client details"
                    : editing.type === "invoices"
                      ? "Edit invoice details"
                      : editing.type === "projects"
                        ? "Edit project details"
                        : "Edit task details"}
                </h2>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            {editing.type === "clients" ? (
              <>
                <input
                  required
                  placeholder="Name"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
                <input
                  placeholder="Company"
                  value={editing.company || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, company: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editing.email || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
                <input
                  placeholder="Phone"
                  value={editing.phone || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
                <select
                  value={editing.status || "active"}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  <option>active</option>
                  <option>inactive</option>
                </select>
              </>
            ) : editing.type === "invoices" ? (
              <>
                <input
                  required
                  placeholder="Invoice number"
                  value={editing.number || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, number: e.target.value })
                  }
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={editing.amount || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, amount: e.target.value })
                  }
                />
                <select
                  value={editing.status || "draft"}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  <option>draft</option>
                  <option>sent</option>
                  <option>paid</option>
                  <option>overdue</option>
                </select>
                <input
                  type="date"
                  value={editing.due_date || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, due_date: e.target.value })
                  }
                />
              </>
            ) : editing.type === "projects" ? (
              <>
                <input required placeholder="Project name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <textarea placeholder="Description" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <select required value={editing.client_id || ""} onChange={(e) => setEditing({ ...editing, client_id: e.target.value })}>
                  <option value="">Choose client</option>
                  {clients.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
                <select value={editing.status || "planning"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option>planning</option><option>active</option><option>on_hold</option><option>completed</option>
                </select>
                <input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
              </>
            ) : (
              <>
                <input required placeholder="Task title" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <textarea placeholder="Description" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <select value={editing.assigned_to || ""} onChange={(e) => setEditing({ ...editing, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {assignees.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
                <select value={editing.priority || "medium"} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}>
                  <option>low</option><option>medium</option><option>high</option>
                </select>
                <select value={editing.status || "todo"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option>todo</option><option>in_progress</option><option>done</option>
                </select>
                <input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
              </>
            )}
            <button className="primary" type="submit">
              Save changes
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
export default App;
