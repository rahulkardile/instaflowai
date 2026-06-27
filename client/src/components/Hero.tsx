import { ArrowRight, Bot, MessageCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "./layout/Container";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 via-white to-white py-24">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">

          <div>

            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700">
              🚀 AI Powered Instagram Automation
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-tight text-slate-900">
              Never Miss an
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                {" "}Instagram Comment
              </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Automatically reply to comments, send personalized DMs,
              and convert followers into customers using AI.
            </p>

            <div className="mt-10 flex gap-4">

              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 font-semibold text-white transition hover:scale-105"
              >
                Start Free
                <ArrowRight size={18} />
              </Link>

              <a
                href="#features"
                className="rounded-xl border px-6 py-4 font-semibold hover:bg-slate-100"
              >
                Learn More
              </a>

            </div>

          </div>

          <div className="relative">

            <div className="rounded-3xl border bg-white p-8 shadow-2xl">

              <h3 className="mb-6 text-lg font-bold">
                Automation Preview
              </h3>

              <div className="space-y-4">

                <div className="rounded-xl bg-slate-100 p-4">
                  💬 "Price?"
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-4">
                  <Bot className="text-purple-600" />
                  AI Reply Generated
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                  <Send className="text-green-600" />
                  DM Sent Successfully
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-pink-50 p-4">
                  <MessageCircle className="text-pink-500" />
                  Customer Engaged
                </div>

              </div>

            </div>

          </div>

        </div>
      </Container>
    </section>
  );
}