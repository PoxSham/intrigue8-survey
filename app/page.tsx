import Header from "./components/Header";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import HowItWorks from "./components/HowItWorks";
import Roadmap from "./components/Roadmap";
import Founding from "./components/Founding";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Roadmap />
        <Founding />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
