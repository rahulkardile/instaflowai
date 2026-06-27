import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Pricing from "../components/Pricing";
import CTA from "../components/CTA";
import FAQ from "../components/FAQ";

export default function Landing() {
  return (
    <>
      <Header />

      <Hero />

      <Features />

      <HowItWorks />

      <Pricing />

      <FAQ />

      <CTA />

      <Footer />
    </>
  );
}