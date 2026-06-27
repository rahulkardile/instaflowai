import Container from "./layout/Container";

const steps = [
  "Sign in with Google",
  "Connect Instagram",
  "Create Automation",
  "Start Growing",
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 py-24">

      <Container>

        <h2 className="mb-16 text-center text-4xl font-bold">
          How It Works
        </h2>

        <div className="grid gap-8 md:grid-cols-4">

          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-2xl bg-white p-8 text-center shadow"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-xl font-bold text-white">
                {index + 1}
              </div>

              <p className="font-semibold">{step}</p>
            </div>
          ))}

        </div>

      </Container>

    </section>
  );
}