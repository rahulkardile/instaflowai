import { Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import { auth } from "../utils/auth";

export default function Dashboard() {
  const session = auth.get();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const { user } = session;

  return (
    <>
      <Header />

      <main className="bg-slate-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                Welcome back, {user.name.split(" ")[0]}
                👋
              </h1>

              <p className="mt-2 text-slate-500">
                Manage your Instagram automations.
              </p>
            </div>

            <img src={user.avatar} className="h-16 w-16 rounded-full border" />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            <Card
              title="Instagram"
              value={user.instagramConnected ? "Connected" : "Not Connected"}
            />

            <Card title="Automations" value="0" />

            <Card title="Replies Today" value="0" />

            <Card title="DM Sent" value="0" />
          </div>

          <div className="mt-10 rounded-3xl bg-white p-10 shadow">
            <h2 className="text-2xl font-bold">Connect Instagram</h2>

            <p className="mt-3 text-slate-500">
              Connect your Instagram Business account to create your first
              automation.
            </p>

            <button className="mt-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 font-semibold text-white">
              Connect Instagram
            </button>
          </div>

          <button
            onClick={() => {
              auth.logout();
              location.href = "/login";
            }}
            className="mt-8 text-red-500"
          >
            Logout
          </button>
        </div>
      </main>
    </>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-slate-500">{title}</p>

      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
    </div>
  );
}
