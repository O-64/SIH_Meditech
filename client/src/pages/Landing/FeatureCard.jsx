const FeatureCard = ({ image, tag, title, desc, onNavigate }) => (
  <div
    className="feature-card"
    style={{ display: "flex", flexDirection: "column" }}
  >
    <div className="feature-card-accent" />
    <img
      src={image}
      alt={title}
      className="feature-card-img"
      onError={(e) => {
        e.target.style.display = "none";
      }}
    />
    <div
      style={{
        padding: "1.5rem 1.75rem 2rem",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#fbbf24",
          background: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.25)",
          borderRadius: "999px",
          padding: "0.2em 0.85em",
          marginBottom: "0.85rem",
        }}
      >
        {tag}
      </span>
      <h3
        className="font-serif"
        style={{
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "#fff",
          marginBottom: "0.65rem",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.9rem",
          color: "rgba(148,163,184,0.85)",
          lineHeight: 1.65,
          marginBottom: "1.5rem",
          flex: 1,
        }}
      >
        {desc}
      </p>
      <button
        onClick={() => onNavigate && onNavigate("signup")}
        className="Sahaay-btn Sahaay-btn-amber"
        style={{ fontSize: "0.85rem" }}
      >
        <span>Begin for free →</span>
      </button>
    </div>
  </div>
);

export default FeatureCard;
