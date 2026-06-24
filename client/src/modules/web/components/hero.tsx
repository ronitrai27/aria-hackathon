"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Meteors } from "@/components/ui/meteors";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col bg-white">
      {/* Micro-animations stylesheet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float-slow-1 {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-12px) scale(1.02) rotate(0.5deg); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-8px) scale(1.01) rotate(-0.5deg); }
        }
        @keyframes float-slow-3 {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-15px) scale(1.03) rotate(0.3deg); }
        }
        @keyframes float-slow-4 {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-6px) scale(1.01) rotate(-0.3deg); }
        }
        .animate-cloud-1 {
          animation: float-slow-1 14s ease-in-out infinite;
        }
        .animate-cloud-2 {
          animation: float-slow-2 16s ease-in-out infinite;
        }
        .animate-cloud-3 {
          animation: float-slow-3 18s ease-in-out infinite;
        }
        .animate-cloud-4 {
          animation: float-slow-4 12s ease-in-out infinite;
        }
      `,
        }}
      />

      {/* Background container: dark purple gradient wrapper with sharp rounded bottom cut */}
      <div className="relative w-full h-[1040px] bg-[#09090e] overflow-hidden flex flex-col justify-between z-10">
        {/* Hero Background Image */}
        <div className="absolute inset-0 bg-[url('/back1.png')] bg-cover bg-bottom bg-no-repeat pointer-events-none z-0 opacity-100" />

        {/* Meteors behind the text */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <Meteors number={15} angle={45} />
        </div>

        {/* Content Wrapper: Badge, Title, Subtitle, CTAs */}
        <div className="relative max-w-7xl mx-auto px-6 text-center z-30 flex-1 flex flex-col justify-start items-center pt-36 pb-20">
          {/* Uppercase Small Badge */}
          <div className="inline-flex items-center justify-center bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-10 md:mb-16">
            <span className="text-sm font-semibold text-white">
              Personal Operating System
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold capitalize tracking-tight text-white max-w-4xl leading-[1.08] mb-10">
            Agent that knows you <br className="hidden sm:inline" />
            better than your EX !!
          </h1>

          {/* Subheading */}
          <p className="text-slate-200 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mb-16 md:mb-20">
            Trained on your life, not the internet.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            {/* Primary CTA */}
            <Link
              href="#book"
              className="group flex items-center justify-between w-full sm:w-auto gap-4 pl-6 pr-2 py-2 rounded-full text-[13px] font-semibold text-black bg-white hover:bg-neutral-100 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              <span>Book a strategy call</span>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 text-white group-hover:bg-black transition-colors duration-200">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </Link>

            {/* Secondary CTA */}
            <Link
              href="#cases"
              className="group flex items-center justify-between w-full sm:w-auto gap-4 pl-6 pr-2 py-2 rounded-full text-[13px] font-semibold text-white bg-indigo-950/45 border border-indigo-500/20 hover:bg-indigo-900/50 hover:border-indigo-400/35 transition-all duration-300 backdrop-blur-md"
            >
              <span>See use cases</span>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white group-hover:bg-white/15 transition-colors duration-200">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </Link>
          </div>
        </div>

        {/* Layered Cloud SVGs (Clipped inside the Background Container) */}
        <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
          {/* Cloud 1 - Bottom Left Back */}
          <div className="absolute bottom-20 -left-20 w-[50%] max-w-[600px] aspect-square animate-cloud-1 opacity-90 mix-blend-screen">
            <Image
              src="/1.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* Cloud 2 - Bottom Right Back */}
          <div className="absolute bottom-12 -right-20 w-[50%] max-w-[600px] aspect-square animate-cloud-2 opacity-90 mix-blend-screen">
            <Image
              src="/2.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* Cloud 3 - Bottom Left Front */}
          <div className="absolute -bottom-10 left-[16%] w-[45%] max-w-[500px] aspect-square animate-cloud-3 opacity-80 mix-blend-screen">
            <Image
              src="/3.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* Cloud 4 - Bottom Right Front */}
          <div className="absolute -bottom-10 right-[5%] w-[45%] max-w-[500px] aspect-square animate-cloud-4 opacity-80 mix-blend-screen">
            <Image
              src="/4.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Symmetrical SVG Mask Curve at the Bottom of the dark background container */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0] z-20 pointer-events-none">
          <svg
            viewBox="0 0 1440 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative block w-full h-[80px] md:h-[180px] lg:h-[220px] text-white"
            preserveAspectRatio="none"
          >
            <path
              d="M0 0 L520 200 Q720 280 920 200 L1440 0 L1440 240 L0 240 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative z-30 w-full max-w-6xl mx-auto px-6 -mt-24 sm:-mt-36 md:-mt-56 lg:-mt-84 pb-24">
        <div className="relative group-video rounded-2xl overflow-hidden border border-white/20 bg-black/40 shadow-[0_0_50px_rgba(99,102,241,0.25)] hover:border-white/30 transition-all duration-500">
          {/* Image Thumbnail */}
          <div className="relative aspect-[16/8] w-full overflow-hidden">
            <Image
              src="/back1.png"
              alt="AgentOS Platform Demo"
              fill
              priority
              className="object-cover transition-transform duration-700 group-hover/video:scale-102"
            />
            <div className="absolute inset-0 bg-black/10 group-hover/video:bg-black/5 transition-colors duration-300" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex items-center justify-center w-16 h-11 rounded-xl bg-neutral-900/80 backdrop-blur-sm text-white border border-white/15 shadow-xl transition-all duration-300 group-hover/video:scale-110 group-hover/video:bg-neutral-800/90 group-hover/video:border-white/25 cursor-pointer">
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
