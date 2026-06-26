// "use client";

// import { useStoreUser } from "@/hooks/useStoreUser";
// import { useEffect, useState } from "react";

// // ─── Types ───────────────────────────────────────────────────────────────────

// interface StepMeta {
//   key: string;
//   tool: string;
//   status: "success" | "error";
//   result?: unknown;
//   error?: string;
// }

// interface WorkflowResponse {
//   success: boolean;
//   steps: StepMeta[];
//   error?: string;
// }

// const REQUIRED_APPS = [
//   { slug: "gmail", label: "Gmail", icon: "📧" },
//   { slug: "calendar", label: "Google Calendar", icon: "📅" },
//   { slug: "slack", label: "Slack", icon: "💬" },
// ];

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: string }) {
//   const isSuccess = status === "success";
//   return (
//     <span
//       style={{
//         background: isSuccess ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
//         color: isSuccess ? "#22c55e" : "#ef4444",
//         border: `1px solid ${isSuccess ? "#22c55e" : "#ef4444"}40`,
//         borderRadius: 6,
//         padding: "2px 10px",
//         fontSize: 11,
//         fontWeight: 700,
//         letterSpacing: 1,
//         textTransform: "uppercase" as const,
//       }}
//     >
//       {status}
//     </span>
//   );
// }

// function Spinner({ size = 18 }: { size?: number }) {
//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       style={{ animation: "spin 0.8s linear infinite" }}
//     >
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//     </svg>
//   );
// }
// // ─── Unread Emails Card ───────────────────────────────────────────────────────

// function UnreadEmailsCard({ steps }: { steps: StepMeta[] }) {
//   const gmailStep = steps.find((s) => s.key === "step_1");
//   if (!gmailStep || gmailStep.status !== "success" || !gmailStep.result)
//     return null;

//   // Parse messages from the Gmail result shape
//   const data = (gmailStep.result as any)?.data;
//   const messages: any[] = data?.messages ?? [];

//   // Filter only UNREAD
//   const unread = messages.filter(
//     (m) => Array.isArray(m.labelIds) && m.labelIds.includes("UNREAD"),
//   );

//   if (unread.length === 0) {
//     return (
//       <div
//         style={{
//           background: "rgba(255,255,255,0.03)",
//           border: "1px solid rgba(255,255,255,0.07)",
//           borderRadius: 14,
//           padding: "22px 24px",
//         }}
//       >
//         <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
//           📭 No unread emails found.
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         background: "rgba(255,255,255,0.03)",
//         border: "1px solid rgba(255,255,255,0.08)",
//         borderRadius: 14,
//         padding: "22px 24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 10,
//           marginBottom: 20,
//         }}
//       >
//         <span style={{ fontSize: 20 }}>📧</span>
//         <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
//           Unread Emails
//         </h3>
//         <span
//           style={{
//             background: "rgba(239,68,68,0.15)",
//             color: "#f87171",
//             border: "1px solid rgba(239,68,68,0.3)",
//             borderRadius: 20,
//             padding: "1px 10px",
//             fontSize: 12,
//             fontWeight: 700,
//           }}
//         >
//           {unread.length} unread
//         </span>
//       </div>

//       <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//         {unread.map((msg, i) => {
//           // Extract subject from payload headers
//           const headers: any[] = msg.payload?.headers ?? [];
//           const subject =
//             headers.find((h: any) => h.name?.toLowerCase() === "subject")
//               ?.value || "(No subject)";
//           const from =
//             headers.find((h: any) => h.name?.toLowerCase() === "from")?.value ||
//             "";

//           // Body: prefer messageText (plain text snippet), else payload body
//           const bodyRaw: string =
//             msg.messageText || msg.snippet || msg.payload?.body?.data || "";

//           // Clean up escaped newlines / excess whitespace
//           const body = bodyRaw
//             .replace(/\\r\\n|\\n|\\r/g, " ")
//             .replace(/\s{2,}/g, " ")
//             .trim()
//             .slice(0, 300);

//           const ts = msg.messageTimestamp
//             ? new Date(msg.messageTimestamp).toLocaleString()
//             : "";

//           return (
//             <div
//               key={msg.messageId ?? i}
//               style={{
//                 background: "rgba(255,255,255,0.04)",
//                 border: "1px solid rgba(255,255,255,0.08)",
//                 borderRadius: 10,
//                 padding: "14px 16px",
//               }}
//             >
//               {/* Subject */}
//               <p
//                 style={{
//                   margin: "0 0 6px",
//                   fontSize: 14,
//                   fontWeight: 700,
//                   color: "#e2e8f0",
//                   lineHeight: 1.4,
//                 }}
//               >
//                 {subject}
//               </p>

//               {/* From + timestamp */}
//               <div
//                 style={{
//                   display: "flex",
//                   gap: 12,
//                   marginBottom: 10,
//                   fontSize: 11,
//                   color: "#475569",
//                   flexWrap: "wrap",
//                 }}
//               >
//                 {from && (
//                   <span>
//                     From: <span style={{ color: "#7dd3fc" }}>{from}</span>
//                   </span>
//                 )}
//                 {ts && <span>{ts}</span>}
//               </div>

//               {/* Body snippet */}
//               {body && (
//                 <p
//                   style={{
//                     margin: 0,
//                     fontSize: 12,
//                     color: "#64748b",
//                     lineHeight: 1.7,
//                     borderLeft: "2px solid rgba(139,92,246,0.3)",
//                     paddingLeft: 10,
//                   }}
//                 >
//                   {body}
//                   {bodyRaw.length > 300 && (
//                     <span style={{ color: "#334155" }}> …</span>
//                   )}
//                 </p>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function WorkflowTestPage() {
//   const { userId: convexUserId, isLoading: userLoading } = useStoreUser();

//   // Connection state
//   const [activeToolkits, setActiveToolkits] = useState<string[]>([]);
//   const [statusLoading, setStatusLoading] = useState(false);
//   const [connectingApp, setConnectingApp] = useState<string | null>(null);

//   // Workflow state
//   const [loading, setLoading] = useState(false);
//   const [response, setResponse] = useState<WorkflowResponse | null>(null);
//   const [workflowError, setWorkflowError] = useState<string | null>(null);
//   const [expandedStep, setExpandedStep] = useState<string | null>(null);

//   // ── Fetch connection status ─────────────────────────────────────────────────
//   const fetchStatus = async () => {
//     if (!convexUserId) return;
//     setStatusLoading(true);
//     try {
//       const res = await fetch(`/api/composio/status?userId=${convexUserId}`);
//       const data = await res.json();
//       setActiveToolkits(data.activeToolkits ?? []);
//     } catch {
//       /* ignore */
//     } finally {
//       setStatusLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStatus();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [convexUserId]);

//   // ── Connect an app ──────────────────────────────────────────────────────────
//   const connectApp = async (slug: string) => {
//     if (!convexUserId) return;
//     setConnectingApp(slug);
//     try {
//       const res = await fetch("/api/composio/connect", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId: convexUserId, appName: slug }),
//       });
//       const data = await res.json();
//       if (data.redirectUrl) {
//         window.open(data.redirectUrl, "_blank");
//         // Poll status after a delay so user can complete OAuth
//         setTimeout(fetchStatus, 8000);
//       } else {
//         alert(data.error || "Failed to get redirect URL");
//       }
//     } catch (e) {
//       alert("Connection request failed");
//     } finally {
//       setConnectingApp(null);
//     }
//   };

//   // ── Run workflow ────────────────────────────────────────────────────────────
//   const runWorkflow = async () => {
//     if (!convexUserId) {
//       setWorkflowError("No user session found – please sign in.");
//       return;
//     }
//     setLoading(true);
//     setWorkflowError(null);
//     setResponse(null);
//     setExpandedStep(null);
//     try {
//       const res = await fetch("/api/composio/test-schedule", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId: convexUserId }),
//       });
//       const data = await res.json();
//       if (!res.ok) {
//         setWorkflowError(data.error || `HTTP ${res.status}`);
//       } else {
//         setResponse(data);
//       }
//     } catch (err: unknown) {
//       setWorkflowError(err instanceof Error ? err.message : "Unknown error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const allConnected = REQUIRED_APPS.every((a) =>
//     activeToolkits.includes(a.slug),
//   );

//   if (userLoading) {
//     return (
//       <div
//         style={{
//           minHeight: "100vh",
//           background: "#0a0a0f",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           color: "#64748b",
//           fontFamily: "Inter, sans-serif",
//         }}
//       >
//         Loading user…
//       </div>
//     );
//   }

//   // ── Render ──────────────────────────────────────────────────────────────────
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background:
//           "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)",
//         padding: "48px 24px",
//         fontFamily: "'Inter', 'Segoe UI', sans-serif",
//         color: "#e2e8f0",
//       }}
//     >
//       <div style={{ maxWidth: 780, margin: "0 auto" }}>
//         {/* ── Header ── */}
//         <div style={{ marginBottom: 36 }}>
//           <div
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 8,
//               background: "rgba(139,92,246,0.12)",
//               border: "1px solid rgba(139,92,246,0.3)",
//               borderRadius: 8,
//               padding: "4px 12px",
//               fontSize: 12,
//               color: "#a78bfa",
//               fontWeight: 600,
//               letterSpacing: 1,
//               textTransform: "uppercase",
//               marginBottom: 16,
//             }}
//           >
//             🧪 Composio Workflow Test
//           </div>
//           <h1
//             style={{
//               fontSize: 32,
//               fontWeight: 800,
//               margin: 0,
//               background: "linear-gradient(135deg, #f8fafc, #a78bfa)",
//               WebkitBackgroundClip: "text",
//               WebkitTextFillColor: "transparent",
//               lineHeight: 1.2,
//             }}
//           >
//             Workflow Runner
//           </h1>
//           <p
//             style={{
//               color: "#64748b",
//               marginTop: 8,
//               fontSize: 14,
//               margin: "8px 0 0",
//             }}
//           >
//             Gmail → Google Calendar → Slack Channels → Slack History
//           </p>
//         </div>

//         {/* ── User info ── */}
//         {convexUserId && (
//           <div
//             style={{
//               background: "rgba(255,255,255,0.04)",
//               border: "1px solid rgba(255,255,255,0.08)",
//               borderRadius: 10,
//               padding: "12px 16px",
//               marginBottom: 24,
//               display: "flex",
//               alignItems: "center",
//               gap: 10,
//               fontSize: 13,
//               flexWrap: "wrap",
//             }}
//           >
//             <span style={{ color: "#64748b" }}>Convex User ID</span>
//             <code
//               style={{
//                 color: "#a78bfa",
//                 fontWeight: 600,
//                 fontFamily: "monospace",
//                 fontSize: 12,
//               }}
//             >
//               {convexUserId}
//             </code>
//           </div>
//         )}

//         {/* ── Step 1: Connect Apps ── */}
//         <div
//           style={{
//             background: "rgba(255,255,255,0.03)",
//             border: "1px solid rgba(255,255,255,0.08)",
//             borderRadius: 14,
//             padding: "22px 24px",
//             marginBottom: 20,
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               marginBottom: 18,
//             }}
//           >
//             <div>
//               <p
//                 style={{
//                   margin: 0,
//                   fontSize: 13,
//                   fontWeight: 700,
//                   color: "#94a3b8",
//                   letterSpacing: 0.5,
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Step 1 — Connect Apps
//               </p>
//               <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
//                 Each app needs a one-time OAuth connection via Composio
//               </p>
//             </div>
//             <button
//               onClick={fetchStatus}
//               disabled={statusLoading}
//               style={{
//                 background: "rgba(255,255,255,0.06)",
//                 border: "1px solid rgba(255,255,255,0.1)",
//                 borderRadius: 8,
//                 padding: "6px 14px",
//                 color: "#94a3b8",
//                 fontSize: 12,
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 6,
//               }}
//             >
//               {statusLoading ? <Spinner size={12} /> : "↻"} Refresh
//             </button>
//           </div>

//           <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//             {REQUIRED_APPS.map((app) => {
//               const connected = activeToolkits.includes(app.slug);
//               const isConnecting = connectingApp === app.slug;
//               return (
//                 <div
//                   key={app.slug}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     background: connected
//                       ? "rgba(34,197,94,0.06)"
//                       : "rgba(255,255,255,0.03)",
//                     border: `1px solid ${connected ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
//                     borderRadius: 10,
//                     padding: "12px 16px",
//                   }}
//                 >
//                   <div
//                     style={{ display: "flex", alignItems: "center", gap: 10 }}
//                   >
//                     <span style={{ fontSize: 20 }}>{app.icon}</span>
//                     <span style={{ fontWeight: 600, fontSize: 14 }}>
//                       {app.label}
//                     </span>
//                     <span
//                       style={{
//                         fontSize: 11,
//                         color: connected ? "#22c55e" : "#ef4444",
//                         background: connected
//                           ? "rgba(34,197,94,0.12)"
//                           : "rgba(239,68,68,0.12)",
//                         border: `1px solid ${connected ? "#22c55e" : "#ef4444"}30`,
//                         borderRadius: 5,
//                         padding: "1px 8px",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {connected ? "✓ Connected" : "Not Connected"}
//                     </span>
//                   </div>

//                   {!connected && (
//                     <button
//                       onClick={() => connectApp(app.slug)}
//                       disabled={isConnecting}
//                       style={{
//                         background: "rgba(139,92,246,0.2)",
//                         border: "1px solid rgba(139,92,246,0.4)",
//                         borderRadius: 8,
//                         padding: "7px 16px",
//                         color: "#a78bfa",
//                         fontSize: 13,
//                         fontWeight: 600,
//                         cursor: isConnecting ? "not-allowed" : "pointer",
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 6,
//                         transition: "all 0.2s",
//                       }}
//                     >
//                       {isConnecting ? (
//                         <>
//                           <Spinner size={13} /> Connecting…
//                         </>
//                       ) : (
//                         "Connect →"
//                       )}
//                     </button>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {allConnected && (
//             <div
//               style={{
//                 marginTop: 14,
//                 background: "rgba(34,197,94,0.08)",
//                 border: "1px solid rgba(34,197,94,0.25)",
//                 borderRadius: 8,
//                 padding: "10px 14px",
//                 color: "#86efac",
//                 fontSize: 13,
//                 fontWeight: 600,
//               }}
//             >
//               ✅ All apps connected — ready to run the workflow!
//             </div>
//           )}
//         </div>

//         {/* ── Step 2: Run Workflow ── */}
//         <div
//           style={{
//             background: "rgba(255,255,255,0.03)",
//             border: "1px solid rgba(255,255,255,0.08)",
//             borderRadius: 14,
//             padding: "22px 24px",
//             marginBottom: 20,
//           }}
//         >
//           <p
//             style={{
//               margin: "0 0 18px",
//               fontSize: 13,
//               fontWeight: 700,
//               color: "#94a3b8",
//               letterSpacing: 0.5,
//               textTransform: "uppercase",
//             }}
//           >
//             Step 2 — Run Workflow
//           </p>

//           {/* Steps preview */}
//           <div
//             style={{
//               marginBottom: 18,
//               display: "flex",
//               flexDirection: "column",
//               gap: 6,
//             }}
//           >
//             {[
//               {
//                 n: 1,
//                 tool: "GMAIL_FETCH_EMAILS",
//                 desc: "Fetch 10 unread inbox emails",
//               },
//               {
//                 n: 2,
//                 tool: "GOOGLECALENDAR_EVENTS_LIST",
//                 desc: "List 10 upcoming events",
//               },
//               {
//                 n: 3,
//                 tool: "SLACK_FETCH_CONVERSATION_HISTORY",
//                 desc: "Last 10 msgs from #all-wekraft",
//               },
//             ].map((s) => (
//               <div
//                 key={s.n}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 10,
//                   fontSize: 13,
//                 }}
//               >
//                 <span
//                   style={{
//                     width: 22,
//                     height: 22,
//                     borderRadius: "50%",
//                     background: "rgba(139,92,246,0.2)",
//                     color: "#a78bfa",
//                     fontSize: 11,
//                     fontWeight: 700,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     flexShrink: 0,
//                   }}
//                 >
//                   {s.n}
//                 </span>
//                 <code
//                   style={{
//                     color: "#7dd3fc",
//                     fontSize: 11,
//                     fontFamily: "monospace",
//                   }}
//                 >
//                   {s.tool}
//                 </code>
//                 <span style={{ color: "#475569", fontSize: 12 }}>{s.desc}</span>
//               </div>
//             ))}
//           </div>

//           <button
//             onClick={runWorkflow}
//             disabled={loading || !convexUserId || !allConnected}
//             style={{
//               width: "100%",
//               padding: "15px",
//               borderRadius: 12,
//               border: "none",
//               background: !allConnected
//                 ? "rgba(100,116,139,0.3)"
//                 : loading
//                   ? "rgba(139,92,246,0.4)"
//                   : "linear-gradient(135deg, #7c3aed, #a855f7)",
//               color: !allConnected ? "#475569" : "#fff",
//               fontSize: 15,
//               fontWeight: 700,
//               cursor: loading || !allConnected ? "not-allowed" : "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               gap: 10,
//               transition: "all 0.2s ease",
//               boxShadow:
//                 allConnected && !loading
//                   ? "0 4px 24px rgba(139,92,246,0.35)"
//                   : "none",
//               letterSpacing: 0.4,
//             }}
//           >
//             {loading ? (
//               <>
//                 <Spinner /> Running workflow…
//               </>
//             ) : !allConnected ? (
//               "⚠️ Connect all apps first"
//             ) : (
//               "⚡ Run Composio Workflow"
//             )}
//           </button>
//         </div>

//         {/* ── Error ── */}
//         {workflowError && (
//           <div
//             style={{
//               marginBottom: 20,
//               background: "rgba(239,68,68,0.08)",
//               border: "1px solid rgba(239,68,68,0.3)",
//               borderRadius: 10,
//               padding: "14px 18px",
//               color: "#fca5a5",
//               fontSize: 13,
//             }}
//           >
//             <strong>Error:</strong> {workflowError}
//           </div>
//         )}

//         {/* ── Raw Results ── */}
//         {response && (
//           <div>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 10,
//                 marginBottom: 16,
//               }}
//             >
//               <span style={{ fontSize: 20 }}>
//                 {response.success ? "✅" : "❌"}
//               </span>
//               <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
//                 Workflow {response.success ? "Completed" : "Failed"}
//               </h2>
//               <span
//                 style={{ color: "#475569", fontSize: 13, marginLeft: "auto" }}
//               >
//                 {response.steps?.length} steps
//               </span>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: 10,
//                 marginBottom: 32,
//               }}
//             >
//               {response.steps?.map((step) => (
//                 <div
//                   key={step.key}
//                   style={{
//                     background: "rgba(255,255,255,0.03)",
//                     border: "1px solid rgba(255,255,255,0.08)",
//                     borderRadius: 12,
//                     overflow: "hidden",
//                   }}
//                 >
//                   <button
//                     onClick={() =>
//                       setExpandedStep(
//                         expandedStep === step.key ? null : step.key,
//                       )
//                     }
//                     style={{
//                       width: "100%",
//                       background: "none",
//                       border: "none",
//                       cursor: "pointer",
//                       padding: "14px 18px",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 12,
//                       textAlign: "left",
//                     }}
//                   >
//                     <StatusBadge status={step.status} />
//                     <span
//                       style={{
//                         color: "#94a3b8",
//                         fontSize: 12,
//                         fontWeight: 600,
//                       }}
//                     >
//                       {step.key.replace("_", " ").toUpperCase()}
//                     </span>
//                     <code
//                       style={{
//                         color: "#7dd3fc",
//                         fontSize: 12,
//                         fontFamily: "monospace",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {step.tool}
//                     </code>
//                     <span
//                       style={{
//                         marginLeft: "auto",
//                         color: "#334155",
//                         fontSize: 12,
//                       }}
//                     >
//                       {expandedStep === step.key ? "▲ collapse" : "▼ expand"}
//                     </span>
//                   </button>

//                   {expandedStep === step.key && (
//                     <div
//                       style={{
//                         borderTop: "1px solid rgba(255,255,255,0.06)",
//                         padding: "16px 18px",
//                       }}
//                     >
//                       {step.error ? (
//                         <p
//                           style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}
//                         >
//                           <strong>Error:</strong> {step.error}
//                         </p>
//                       ) : (
//                         <pre
//                           style={{
//                             margin: 0,
//                             fontSize: 11,
//                             color: "#94a3b8",
//                             background: "rgba(0,0,0,0.3)",
//                             borderRadius: 8,
//                             padding: "14px",
//                             overflowX: "auto",
//                             maxHeight: 360,
//                             overflowY: "auto",
//                             fontFamily: "monospace",
//                             lineHeight: 1.6,
//                           }}
//                         >
//                           {JSON.stringify(step.result, null, 2)}
//                         </pre>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>

//       </div>
//     </div>
//   );
// }

export default function TestPage() {
  return null;
}
