import Container from "./layout/Container";

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <Container>
        <h2 className="mb-16 text-center text-4xl font-bold">Pricing</h2>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            ["Free", "₹0"],
            ["Pro", "₹999"],
            ["Agency", "₹2999"],
          ].map(([name, price]) => (
            <div
              key={name}
              className="rounded-2xl border bg-white p-8 text-center"
            >
              <h3 className="text-2xl font-bold">{name}</h3>

              <p className="my-8 text-5xl font-extrabold">{price}</p>

              <button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 font-semibold text-white">
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
