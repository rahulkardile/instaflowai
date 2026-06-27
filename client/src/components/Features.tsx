import {
  Bot,
  MessageCircleReply,
  Send,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import Container from "./layout/Container";
import FeatureCard from "./FeatureCard";


export default function Features() {
  return (
    <section id="features" className="py-24">
      <Container>

        <div className="mb-16 text-center">

          <h2 className="text-4xl font-bold">
            Everything you need
          </h2>

          <p className="mt-4 text-slate-500">
            Powerful automation designed for creators and businesses.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          <FeatureCard
            icon={<Zap />}
            title="Instant Replies"
            description="Reply within seconds."
          />

          <FeatureCard
            icon={<Bot />}
            title="AI Generated Replies"
            description="Natural conversations."
          />

          <FeatureCard
            icon={<Send />}
            title="Auto DM"
            description="Send personalized messages."
          />

          <FeatureCard
            icon={<MessageCircleReply />}
            title="Keyword Automation"
            description="Trigger workflows automatically."
          />

          <FeatureCard
            icon={<BarChart3 />}
            title="Analytics"
            description="Track conversions."
          />

          <FeatureCard
            icon={<Shield />}
            title="Secure"
            description="Google Authentication."
          />

        </div>

      </Container>
    </section>
  );
}