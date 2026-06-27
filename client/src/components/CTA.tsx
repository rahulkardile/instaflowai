import { Link } from "react-router-dom";
import Container from "./layout/Container";

export default function CTA() {
  return (
    <section className="py-24">

      <Container>

        <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-pink-500 p-16 text-center text-white">

          <h2 className="text-4xl font-bold">
            Ready to automate your Instagram?
          </h2>

          <p className="mt-6 text-lg opacity-90">
            Join creators and businesses saving hours every week.
          </p>

          <Link
            to="/login"
            className="mt-10 inline-block rounded-xl bg-white px-8 py-4 font-semibold text-purple-700 transition hover:scale-105"
          >
            Start Free with Google
          </Link>

        </div>

      </Container>

    </section>
  );
}