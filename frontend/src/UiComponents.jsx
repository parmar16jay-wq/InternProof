import { Link } from "react-router-dom";

export function PageHeader({ eyebrow, title, description, action, to }) {
  return <div className="page-heading-row"><div>{eyebrow && <span className="section-eyebrow">{eyebrow}</span>}<h1 className={eyebrow ? "mt-2" : ""}>{title}</h1>{description && <p className="text-muted mb-0">{description}</p>}</div>{action && (to ? <Link className="btn btn-primary" to={to}>{action}</Link> : action)}</div>;
}

export function StatCard({ label, value, note, to }) {
  const content = <><span>{label}</span><strong>{value ?? "—"}</strong>{note && <small>{note}</small>}<i>↗</i></>;
  return to ? <Link to={to} className="metric-card">{content}</Link> : <div className="metric-card">{content}</div>;
}

export function StatusBadge({ status }) {
  const value = String(status || "pending").toLowerCase();
  return <span className={`status-pill status-${value}`}>{value}</span>;
}

export function LoadingSpinner({ label = "Loading…" }) {
  return <div className="page-loading"><div className="spinner-border text-primary" role="status"/><span>{label}</span></div>;
}

export function EmptyState({ title, description, action, to }) {
  return <div className="empty-inline">{title && <b>{title}</b>}{description && <span>{description}</span>}{action && to && <Link className="btn btn-outline-primary btn-sm" to={to}>{action}</Link>}</div>;
}

export function DataTable({ headers = [], children }) {
  return <div className="table-responsive"><table className="table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function ProgressCard({ title, value = 0, detail }) {
  const boundedValue = Math.min(100, Math.max(0, Number(value) || 0));
  return <section className="panel-card progress-panel"><div className="panel-heading"><h2>{title}</h2><b>{boundedValue}%</b></div><div className="progress track-progress"><div className="progress-bar" style={{ width: `${boundedValue}%` }}/></div>{detail && <p className="small text-muted mt-2 mb-0">{detail}</p>}</section>;
}
