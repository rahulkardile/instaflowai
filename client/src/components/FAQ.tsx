import Container from "./layout/Container";

const faqs = [
  {
    q: "Do I need coding knowledge?",
    a: "No. Everything works through a visual interface.",
  },
  {
    q: "Can I connect multiple Instagram accounts?",
    a: "Yes, with Pro and Agency plans.",
  },
  {
    q: "Is my account secure?",
    a: "Yes. We use secure OAuth authentication.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="bg-slate-50 py-24">
      <Container>
        <h2 className="mb-12 text-center text-4xl font-bold">
          Frequently Asked Questions
        </h2>

        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl bg-white p-6 shadow">
              <h3 className="font-semibold">{faq.q}</h3>

              <p className="mt-3 text-slate-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
