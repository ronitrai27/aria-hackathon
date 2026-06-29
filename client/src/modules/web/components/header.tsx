"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";

export default function Header() {
  const { isLoaded, isSignedIn, user } = useUser();
  
  const navItems = [
    { label: "Services", href: "#services" },
    { label: "Process", href: "#process" },
    { label: "Pricing", href: "#pricing" },
    { label: "Use cases", href: "#use-cases" },
    { label: "Contact", href: "#contact" },
  ];
  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl"
          />
          <span className="text-white font-semibold text-lg tracking-tight transition-colors duration-200 group-hover:text-indigo-200">
            Aria
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 bg-white/[0.03] border border-white/[0.06] backdrop-blur-md rounded-full px-6 py-2.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium text-slate-300 hover:text-white transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA Button / User Profile */}
        {isLoaded && isSignedIn ? (
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="group flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full text-xs font-semibold text-white bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              <span>Dashboard</span>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white group-hover:bg-white/20 transition-all duration-200">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </Link>
            <Avatar className="h-9 w-9 border border-white/20 shadow-sm select-none">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
              <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">
                {user?.firstName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <Link
            href="/sign-up"
            className="group flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full text-xs font-semibold text-white bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
          >
            <span>Sign up</span>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white group-hover:bg-white/20 transition-all duration-200">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </Link>
        )}
      </header>
    </>
  );
}
