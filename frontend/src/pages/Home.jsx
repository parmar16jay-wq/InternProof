import { Link } from "react-router-dom";

const features = [
  ["01", "Internship management", "Keep opportunities, placements, and key dates organized in one trusted workspace."],
  ["02", "Application tracking", "Follow every application from submission through a clear decision."],
  ["03", "Task management", "Give students a shared view of their responsibilities and deadlines."],
  ["04", "Progress tracking", "Make day to day progress visible to students and their mentors."],
  ["05", "Communication", "Keep useful internship conversations connected to the right people."],
  ["06", "Verified certificates", "Bring completed work and supporting certificate records together."],
  ["07", "Evidence records", "Create a dependable record of internship milestones and outcomes."],
  ["08", "Reports", "Give colleges and administrators a clear view of platform activity."]
];

const aboutFeatures = [
  ["Internship Management", "Manage internship information and activities in one place."],
  ["Task Tracking", "Students can view assigned tasks and track their completion progress."],
  ["Evidence Management", "Upload and manage proof of completed internship work."],
  ["Verified Internship Records", "Keep internship progress and completion information organized."]
];

const audiences = [
  ["Students", "Manage internships, complete tasks, upload evidence and track your progress."],
  ["Companies & Mentors", "Manage internships, assign tasks and review student work."],
  ["Colleges", "Monitor students and verify internship activities and completion."]
];

function Home() {
  return <>
    <nav className="navbar navbar-expand-lg public-nav sticky-top"><div className="container"><Link className="navbar-brand d-flex align-items-center gap-2" to="/"><span className="brand-mark">ip</span>InternProof</Link><button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNav" aria-label="Toggle navigation"><span className="navbar-toggler-icon" /></button><div className="collapse navbar-collapse" id="publicNav"><div className="navbar-nav mx-auto gap-lg-3"><a className="nav-link" href="#home">Home</a><a className="nav-link" href="#internships">Internships</a><a className="nav-link" href="#about">About</a><a className="nav-link" href="#features">Features</a><a className="nav-link" href="#contact">Contact</a></div><div className="d-flex gap-2 mt-3 mt-lg-0"><Link to="/login" className="btn btn-light btn-sm px-3">Login</Link><Link to="/register" className="btn btn-primary btn-sm px-3">Get started</Link></div></div></div></nav>
    <main>
      <section className="home-hero" id="home"><div className="container"><div className="row align-items-center g-4"><div className="col-lg-7"><span className="hero-kicker"><i /> VERIFIABLE INTERNSHIP & OJT PLATFORM</span><h1>Build your career with <em>verified</em> experience.</h1><p>InternProof connects students, companies, and colleges to manage internships, track progress, verify achievements, and maintain trusted internship records.</p><div className="d-flex flex-wrap gap-3 mt-4"><Link to="/student/internships" className="btn btn-primary btn-lg px-4">Explore internships <span className="ms-2">↗</span></Link><Link to="/register" className="btn btn-outline-primary btn-lg px-4">Get started</Link></div><div className="d-flex align-items-center gap-2 mt-4 small text-muted"><span className="text-success fw-bold">✓</span> One clear record, from application to achievement</div></div><div className="col-lg-5"><div className="hero-art"><div className="hero-orbit"><div className="orbit-core">ip</div></div><div className="float-card float-one"><span className="float-check">● VERIFIED RECORD</span><strong>Experience, with proof</strong></div><div className="float-card float-two">Internship progress<strong>On track <span className="float-check">↗</span></strong></div></div></div></div></div></section>
      <section className="stat-strip"><div className="container"><div className="row text-center g-3"><div className="col-6 col-lg-3"><strong>Students</strong><span>Ready to build experience</span></div><div className="col-6 col-lg-3"><strong>Companies</strong><span>Creating opportunities</span></div><div className="col-6 col-lg-3"><strong>Internships</strong><span>Managed in one place</span></div><div className="col-6 col-lg-3"><strong>Certificates</strong><span>Backed by evidence</span></div></div></div></section>
      <section className="section-pad home-about" id="about"><div className="container"><div className="about-provides"><span className="section-eyebrow">A clearer path to experience</span><h2>What InternProof Provides</h2><div className="about-feature-list">{aboutFeatures.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div></div></section>
      <section className="section-pad pt-0" id="features"><div className="container"><div className="mb-4"><span className="section-eyebrow">Everything in one place</span><h2 className="section-heading">Tools for the full internship journey</h2></div><div className="row g-3">{features.map(([num,title,body])=><div className="col-sm-6 col-lg-3" key={num}><article className="feature-tile"><div className="feature-icon">{num}</div><h3>{title}</h3><p>{body}</p></article></div>)}</div></div></section>
      <section className="section-pad pt-0" id="internships">
        <div className="container">
          <div className="mb-4">
            <h2 className="section-heading">Built For Everyone</h2>
          </div>
          <div className="row g-3">{audiences.map(([title, body], index) => <div className="col-md-6 col-lg-4" key={title}><article className={`audience-card audience-card-${index + 1}`}><span className="audience-marker" aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article></div>)}</div>
        </div>
      </section>
      <section className="section-pad pt-0"><div className="container"><div className="home-cta"><div><span className="section-eyebrow" style={{color:'#A5F3FC'}}>A better way to manage experience</span><h2>Start managing internships smarter.</h2><div className="small" style={{color:'#D1D5DB'}}>Bring your people, progress, and proof together.</div></div><Link to="/register" className="btn btn-light px-4">Create your account ↗</Link></div></div></section>
      <section className="section-pad pt-0" id="contact"><div className="container"><div className="contact-panel"><div className="contact-intro"><span className="section-eyebrow">We’re here to help</span><h2>Get in touch</h2><p>Questions about InternProof? Send our team a message and we’ll be glad to help.</p><a className="contact-email" href="mailto:internproof.team@gmail.com">internproof.team@gmail.com</a></div><div className="contact-details"><article><span className="contact-icon" aria-hidden="true">✉</span><div><h3>Email us</h3><a href="mailto:internproof.team@gmail.com">internproof.team@gmail.com</a></div></article><article><span className="contact-icon" aria-hidden="true">☎</span><div><h3>Call our team</h3><a href="tel:+15550102040">+1 (555) 010-2040</a></div></article><article><span className="contact-icon" aria-hidden="true">◷</span><div><h3>Support hours</h3><p>Monday–Friday, 9:00 AM–5:00 PM</p></div></article></div></div></div></section>
    </main>
    <footer className="home-footer"><div className="container d-flex flex-wrap justify-content-between gap-2"><span><b className="text-dark">InternProof</b> · Verifiable Internship and OJT Evidence Platform</span><span>© 2026 InternProof</span></div></footer>
  </>;
}
export default Home;
