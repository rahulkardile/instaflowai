import Container from "./Container";

export default function Footer() {
  return (
    <footer className="border-t py-12">
      <Container>
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <h2 className="text-xl font-bold">
              InstaFlow
            </h2>
            <p className="mt-3 max-w-md text-slate-500">
              Automate Instagram comments,
              send instant DMs and convert
              followers into customers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="font-semibold">
                Product
              </h3>
              <ul className="mt-4 space-y-2 text-slate-500">
                <li>Features</li>
                <li>Pricing</li>
                <li>Dashboard</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">
                InstaFlow pvt limited
              </h3>
              <ul className="mt-4 space-y-2 text-slate-500">
                <li>About</li>
                <li>Privacy</li>
                <li>Terms</li>
              </ul>
            </div>

          </div>

        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-slate-500">
          © 2026 InstaFlow. Built with ❤️ in India.
        </div>

      </Container>

    </footer>
  );
}