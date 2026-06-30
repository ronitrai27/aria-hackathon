"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const productLinks = [
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#integrations" },
    { label: "Pricing", href: "#pricing" },
    { label: "Use cases", href: "#use-cases" },
  ];

  const companyLinks = [
    { label: "About us", href: "#about" },
    { label: "Careers", href: "#careers" },
    { label: "Contact", href: "#contact" },
  ];

  const resourceLinks = [
    { label: "Documentation", href: "#docs" },
    { label: "Help Center", href: "#help" },
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
  ];

  return (
    <footer className="relative bg-[#09090e] border-t border-white/[0.04] text-slate-400 py-16 md:py-20 overflow-hidden">
      {/* Soft gradient accent for depth */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[350px] h-[350px] bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        {/* Main Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 md:gap-8 mb-16">
          {/* Logo & Tagline (span 2 cols) */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-white font-semibold text-base tracking-tight transition-colors duration-200 group-hover:text-indigo-200">
                Aria
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-slate-400 max-w-xs mt-2">
              The personal operating system that coordinates your tools,
              prioritizes your day, and automates your workflows.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-4">
              <Link
                href=""
                target="_blank"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                <Image
                  src="/discord.png"
                  alt="Discord"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </Link>
              <Link
                href=""
                target="_blank"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                <Image
                  src="/github.png"
                  alt="GitHub"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain brightness-0 invert"
                />
              </Link>
              <Link
                href=""
                target="_blank"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                <Image
                  src="/linkedin.png"
                  alt="LinkedIn"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </Link>
            </div>
          </div>

          {/* Spacer for offset in desktop */}
          <div className="hidden md:block col-span-1" />

          {/* Links Column: Product */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Product
            </h4>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column: Company */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column: Resources */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Resources
            </h4>
            <ul className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/[0.04] pt-8 gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Aria Technologies Inc. All rights
            reserved.
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-indigo-500 fill-indigo-500" />
            <span>for the future of work.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
