import Header from "@/modules/web/components/header";
import Hero from "@/modules/web/components/hero";
import AgentPopup from "@/modules/Ai/websiteHelper";

export default function Home() {
  return (
    <div className="flex flex-col relative w-full min-h-screen bg-white overflow-x-hidden">
      <Header />
      <Hero />
      <AgentPopup />
    </div>
  );
}

