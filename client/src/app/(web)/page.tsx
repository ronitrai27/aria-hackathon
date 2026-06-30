import Footer from "@/modules/web/components/footer";
import Header from "@/modules/web/components/header";
import Hero from "@/modules/web/components/hero";
import UseCase from "@/modules/web/components/usecase";

export default function Home() {
  return (
    <div className="flex flex-col relative w-full min-h-screen bg-white overflow-x-hidden">
      <Header />
      <Hero />
      <UseCase />
      <Footer />
    </div>
  );
}
