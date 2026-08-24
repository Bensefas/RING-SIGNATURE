import Layout from "../components/Layout";

function AdminDashboard({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="dashboard-shell">
        <section style={{ padding: 24 }}>
          <h1>System Administrator</h1>
          <p>Read-only university incident oversight.</p>
        </section>
      </div>
    </Layout>
  );
}

export default AdminDashboard;
