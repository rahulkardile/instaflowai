export default function Home() {
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-4 text-4xl font-bold text-slate-900">
          Welcome Home 🎉
        </h1>

        <p className="mb-8 text-lg text-slate-600">
          You are successfully logged in!
        </p>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}