function DashboardCard({
  title,
  value,
  color = "#2563EB",
  subtitle,
}) {
  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.bar,
          background: color,
        }}
      />

      <div style={styles.value}>{value}</div>

      <div style={styles.title}>{title}</div>

      {subtitle && (
        <div style={styles.subtitle}>{subtitle}</div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 28px rgba(0,0,0,.08)",
    position: "relative",
    overflow: "hidden",
  },

  bar: {
    height: 5,
    borderRadius: 10,
    marginBottom: 18,
  },

  value: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#0F172A",
  },

  title: {
    color: "#64748B",
    marginTop: 6,
    fontWeight: 600,
  },

  subtitle: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 13,
  },
};

export default DashboardCard;