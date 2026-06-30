import {
  Activity,
  ArrowRight,
  Calendar,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface UseCaseItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  gradientClass: string;
  apps: { name: string; icon: string }[];
}

export default function UseCase() {
  const useCases: UseCaseItem[] = [
    {
      id: "meeting-sync",
      badge: "Automation",
      title: "Meeting Sync & Communication",
      description:
        "Auto-create Google Meet links in Google Calendar and instantly notify your team on Slack with context-rich alerts.",
      icon: <Calendar className="w-5 h-5 text-indigo-600" />,
      colorClass: "hover:border-indigo-200 hover:shadow-indigo-500/[0.04]",
      gradientClass: "from-indigo-500/10 via-transparent to-transparent",
      apps: [
        { name: "Google Calendar", icon: "📅" },
        { name: "Slack", icon: "💬" },
      ],
    },
    {
      id: "ai-research",
      badge: "AI Workflow",
      title: "Autonomous Research & Reports",
      description:
        "Let Aria research topic updates on the web, draft detailed summaries into Google Docs, and email stakeholders automatically.",
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      colorClass: "hover:border-purple-200 hover:shadow-purple-500/[0.04]",
      gradientClass: "from-purple-500/10 via-transparent to-transparent",
      apps: [
        { name: "Gemini", icon: "✨" },
        { name: "Google Docs", icon: "📝" },
        { name: "Gmail", icon: "✉️" },
      ],
    },
    {
      id: "Autonomous Task Creation",
      badge: "Autonomous Task Creation",
      title: "Good Bye to mannual work",
      description:
        "Instantly upload doc or ask brain to see my previous browser activity and create important task from it. HITL in the flow , so everything is under controll",
      icon: <GitPullRequest className="w-5 h-5 text-sky-600" />,
      colorClass: "hover:border-sky-200 hover:shadow-sky-500/[0.04]",
      gradientClass: "from-sky-500/10 via-transparent to-transparent",
      apps: [
        { name: "Linear", icon: "📐" },
        { name: "Discord", icon: "👾" },
      ],
    },
    {
      id: "privacy-tracking",
      badge: "Discover patterns",
      title: "Privacy-First Activity Tracking",
      description:
        "Aria web tracker extension sees what you do with privacy in mind and gives your agent a real power to understand your day.",
      icon: <Activity className="w-5 h-5 text-emerald-600" />,
      colorClass: "hover:border-emerald-200 hover:shadow-emerald-500/[0.04]",
      gradientClass: "from-emerald-500/10 via-transparent to-transparent",
      apps: [
        { name: "Aria Browser Extension", icon: "🧩" },
        { name: "System Insights", icon: "📊" },
      ],
    },
  ];

  return (
    <section
      id="use-cases"
      className="relative py-24 bg-white overflow-hidden border-t border-neutral-100"
    >
      {/* Subtle Background Dotted Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Decorative Gradient Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center justify-center bg-indigo-50 border border-indigo-100/80 px-3.5 py-1 rounded-full mb-6">
            <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">
              Use Cases
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-5 leading-tight">
            Supercharge your workflow. <br />
            Let AI handle the routine.
          </h2>

          <p className="text-neutral-500 text-sm md:text-base leading-relaxed">
            Connect your everyday tools and build autonomous agents that
            coordinate tasks, schedule your day, and execute workflows in the
            background.
          </p>
        </div>

        {/* Grid of Use Cases */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {useCases.map((useCase) => (
            <div
              key={useCase.id}
              className={`group relative flex flex-col justify-between p-6 md:p-8 rounded-2xl bg-white border border-neutral-200/80 transition-all duration-300 ${useCase.colorClass}`}
            >
              {/* Subtle top-left gradient hover glow */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${useCase.gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Badge and Icon */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-semibold text-neutral-400 tracking-wide uppercase">
                    {useCase.badge}
                  </span>
                  <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                    {useCase.icon}
                  </div>
                </div>

                {/* Title and Description */}
                <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-indigo-950 transition-colors duration-200">
                  {useCase.title}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                  {useCase.description}
                </p>
              </div>

              {/* Connected Apps & CTA */}
              <div className="relative z-10 flex items-center justify-between border-t border-neutral-100 pt-5 mt-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-400 mr-1.5 uppercase tracking-wider">
                    Apps:
                  </span>
                  <div className="flex -space-x-1">
                    {useCase.apps.map((app) => (
                      <div
                        key={app.name}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 text-xs shadow-sm"
                        title={app.name}
                      >
                        {app.icon}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[13px] font-semibold text-neutral-700 group-hover:text-indigo-600 transition-colors duration-200">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Minimal Footer CTA in Section */}
        <div className="mt-16 text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
          >
            <span>Ready to automate your dashboard? Get started for free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
