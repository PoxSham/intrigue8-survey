import Header from "./components/Header";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import HowItWorks from "./components/HowItWorks";
import Roadmap from "./components/Roadmap";
import TrialOffer from "./components/TrialOffer";
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
        <TrialOffer />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
