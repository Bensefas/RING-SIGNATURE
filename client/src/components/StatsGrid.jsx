import DashboardCard from "./DashboardCard";

function StatsGrid() {
  return (
    <div style={styles.grid}>
      <DashboardCard
        title="Total Reports"
        value="12"
        color="#2563EB"
      />

      <DashboardCard
        title="Pending"
        value="3"
        color="#F59E0B"
      />

      <DashboardCard
        title="Resolved"
        value="9"
        color="#10B981"
      />

      <DashboardCard
        title="Critical"
        value="1"
        color="#DC2626"
      />
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    margin: "25px 0"
  }
};

export default StatsGrid;