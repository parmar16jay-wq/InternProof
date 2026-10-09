import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { clearAuthUser, readAuthUser } from "./authSession";

const navigation = {
  student: [["Overview", "/student/dashboard"], ["Explore internships", "/student/internships"], ["Applications", "/student/applications"], ["My internship", "/student/internship"], ["Tasks", "/student/tasks"], ["Progress", "/student/progress"], ["Certificates", "/student/certificate"], ["Messages", "/student/messages"], ["Profile", "/student/profile"]],
  company: [["Overview", "/company/dashboard"], ["Internship Opportunities", "/company/internships"], ["Applications", "/company/applications"], ["Interns", "/company/students"], ["Tasks & Evidence", "/company/tasks"], ["Mentor Evaluations", "/company/mentor-evaluations"], ["Text Messages", "/company/messages"], ["Certificates", "/company/certificates"], ["Profile", "/company/profile"]],
  college: [["Overview", "/college/dashboard"], ["Students", "/college/students"], ["Verification Requests", "/college/verification-requests"], ["Internships", "/college/internships"], ["Mentor Evaluations", "/college/mentor-evaluations"], ["Applications", "/college/applications"], ["Certificates", "/college/certificates"], ["Reports", "/college/reports"], ["Profile", "/college/profile"]],
  admin: [["Overview", "/admin/dashboard"], ["Manage users", "/admin/users"], ["Internships", "/admin/internships"], ["Companies", "/admin/companies"], ["Colleges", "/admin/colleges"], ["Platform reports", "/admin/reports"], ["Verification", "/admin/verification"], ["Certificates", "/admin/certificates"]],
};
const routeRole = (path) => ["student", "company", "college", "admin"].find((role) => path.startsWith(`/${role}/`));

export default function AppChrome({ children }) {
  const { pathname } = useLocation();
  const role = routeRole(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = readAuthUser();
  if (role && user?.role !== role) return <Navigate to={user?.role && navigation[user.role] ? `/${user.role}/dashboard` : "/login"} replace />;
  if (!role) return children;
  const signOut = () => { clearAuthUser(); window.location.assign("/login"); };
  return <div className="app-shell">
    <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
      <Link to="/" className="brand-lockup"><span className="brand-mark">ip</span><span>internproof<small>Evidence, made clear.</small></span></Link>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>{navigation[role].map(([label, href], index) => <Link key={href} onClick={() => setMenuOpen(false)} className={`sidebar-link ${pathname === href ? "active" : ""}`} to={href}><span className="nav-index">{String(index + 1).padStart(2, "0")}</span>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="user-chip"><span className="avatar">{(user?.full_name || user?.name || "U").slice(0, 1).toUpperCase()}</span><span><b>{user?.full_name || user?.name || "Account"}</b><small>{role} workspace</small></span></div><button className="logout-link" onClick={signOut}>Sign out <span>↗</span></button></div>
    </aside>
    <div className="workspace"><header className="workspace-topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button><div><span className="topbar-context">INTERNPROOF / {role.toUpperCase()}</span><span className="topbar-title">{navigation[role].find(([, href]) => href === pathname)?.[0] || "Workspace"}</span></div><span className="topbar-status"><i /> All systems operational</span></header><main className="workspace-content">{children}</main></div>
  </div>;
}
