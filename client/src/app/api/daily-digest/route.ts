import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { Composio } from "@composio/core";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import * as fs from "fs";
import * as path from "path";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const customOpenai = createOpenAI({
  // apiKey: process.env.OPENAI_API_KEY,
  apiKey: "sk-",
});

const model = customOpenai("gpt-4.1-nano");

// Helper to convert GPT text/markdown into docx file
async function generateDocxFile(text: string, outputPath: string) {
  const lines = text.split("\n");
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Daily Digest Briefing",
          bold: true,
          size: 32,
        }),
      ],
      spacing: { before: 200, after: 200 },
    }),
  );

  // Divider
  children.push(
    new Paragraph({
      children: [new TextRun("──────────────────────────────────────────")],
      spacing: { after: 200 },
    }),
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace("# ", ""),
              bold: true,
              size: 28,
            }),
          ],
          spacing: { before: 200, after: 100 },
        }),
      );
    } else if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace("## ", ""),
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 150, after: 100 },
        }),
      );
    } else if (trimmed.startsWith("### ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace("### ", ""),
              bold: true,
              size: 20,
            }),
          ],
          spacing: { before: 120, after: 80 },
        }),
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      // List item
      const content = trimmed.substring(2);
      const parts = content.split("**");
      const textRuns: TextRun[] = [];

      for (let i = 0; i < parts.length; i++) {
        textRuns.push(
          new TextRun({
            text: parts[i],
            bold: i % 2 === 1,
            size: 22,
          }),
        );
      }

      children.push(
        new Paragraph({
          children: textRuns,
          bullet: { level: 0 },
          spacing: { after: 100 },
        }),
      );
    } else {
      // Standard paragraph
      const parts = trimmed.split("**");
      const textRuns: TextRun[] = [];

      for (let i = 0; i < parts.length; i++) {
        textRuns.push(
          new TextRun({
            text: parts[i],
            bold: i % 2 === 1,
            size: 22,
          }),
        );
      }

      children.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 120 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  let tempFilePath: string | null = null;

  try {
    const body = await req.json();
    userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing parameter: userId" },
        { status: 400 },
      );
    }

    console.log(`[Daily Digest API] Initiating digest run for user: ${userId}`);

    // 1. Fetch User details
    const userInfo = await convex.query(api.dailyDigest.getUserInfoForDigest, {
      userId,
    });
    if (!userInfo) {
      return NextResponse.json(
        { error: "User profile not found in Convex" },
        { status: 404 },
      );
    }

    console.log(
      `[Daily Digest API] User resolved: ${userInfo.name} <${userInfo.email}>`,
    );

    // 2. Set status to running in DB
    await convex.mutation(api.dailyDigest.updateDigestStateInternal, {
      userId,
      status: "running",
    });

    // 3. Fetch task details
    const tasks = await convex.query(api.dailyDigest.getTasksForDigest, {
      userId,
    });
    console.log(`[Daily Digest API] Pulled ${tasks.length} tasks from Convex.`);

    // 4. Build prompt for GPT-4.1-Nano
    const tasksFormatted = tasks
      .map((t, idx) => {
        const estimationStr = t.estimation
          ? `from ${new Date(t.estimation.startDate).toLocaleDateString()} to ${new Date(t.estimation.endDate).toLocaleDateString()}`
          : "N/A";
        return `${idx + 1}. Title: "${t.title}"
   - Description: ${t.description || "No description provided."}
   - Status: ${t.status}
   - Priority: ${t.priority}
   - Timeline: ${estimationStr}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a professional executive business advisor and workload management assistant.
Your goal is to analyze the user's workload/task database and write a structured, clear, and highly professional Daily Briefing Report.

Your report MUST include:
1. Executive Summary: High-level overview of the user's current project tasks and progress.
2. Important Actions to Take: Critical items or tasks they should prioritize next based on high priority, deadlines, and urgency.
3. Delayed Tasks: Specifically call out tasks that are marked 'delayed' or whose timelines are in the past and still incomplete, offering recommendations.
4. Strategic Recommendations: Next-step productivity tips for managing their schedules effectively.

Return the briefing in clear Markdown formatting. Do not output code blocks. Be concise, direct, and actionable.`;

    const prompt = `Here is my tasks database for analysis:

${tasks.length === 0 ? "No tasks found in my database." : tasksFormatted}

Please synthesize and write my Daily Briefing report.`;

    console.log("[Daily Digest API] Triggering gpt-4.1-nano generation...");
    const aiResponse = await generateText({
      model,
      system: systemPrompt,
      prompt,
    });

    const reportText = aiResponse.text;
    console.log("[Daily Digest API] Summary report generated successfully.");

    // 5. Convert to Docx report
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const cleanId = String(userInfo.id).replace(/[^\w-]/g, "");
    tempFilePath = path.join(tempDir, `daily_digest_${cleanId}.docx`);

    console.log(
      `[Daily Digest API] Creating .docx report file at: ${tempFilePath}`,
    );
    await generateDocxFile(reportText, tempFilePath);

    // 6. Send email using Composio
    const composioApiKey = process.env.COMPOSIO_API_KEY;
    if (!composioApiKey) {
      throw new Error(
        "COMPOSIO_API_KEY environment variable is not configured",
      );
    }

    console.log("[Daily Digest API] Uploading .docx file to Composio...");
    const composio = new Composio({ apiKey: composioApiKey });
    const fileData = await composio.files.upload({
      file: tempFilePath,
      toolSlug: "GMAIL_SEND_EMAIL",
      toolkitSlug: "gmail",
    });

    console.log(
      "[Daily Digest API] File staged to Composio successfully:",
      fileData,
    );

    const emailSubject = `Your Daily Workload Briefing - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    const emailBody = `Hi ${userInfo.name},\n\nHere is your Daily Workload Briefing & Task Analysis Report prepared by your assistant.\n\nWe have summarized your workload, highlighted critical next actions, and called out delayed items for you to check.\n\nPlease find the detailed report attached as a Word document (.docx).\n\nBest regards,\nAria OS Assistant`;

    console.log(
      `[Daily Digest API] Triggering GMAIL_SEND_EMAIL to ${userInfo.email}...`,
    );
    const executeResult = await composio.tools.execute("GMAIL_SEND_EMAIL", {
      userId: userId, // Pass the same ID used when connecting Gmail in Composio
      dangerouslySkipVersionCheck: true,
      arguments: {
        recipient_email: userInfo.email,
        to: userInfo.email,
        subject: emailSubject,
        body: emailBody,
        attachment: fileData,
        attachments: [fileData], // Include both for safety/compatibility
      },
    });

    console.log(
      "[Daily Digest API] Gmail send action executed successfully:",
      executeResult,
    );

    // 7. Update status to success in DB
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nextRun = now + oneDayMs; // set to exactly 24 hours from now

    await convex.mutation(api.dailyDigest.updateDigestStateInternal, {
      userId,
      status: "success",
      lastRun: now,
      nextRun: nextRun,
      error: undefined,
      lastReportText: reportText,
    });

    // Cleanup local temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Daily Digest API] Temp docx file cleaned up.");
    }

    return NextResponse.json({
      success: true,
      message: "Daily digest sent successfully.",
      lastRun: now,
      nextRun,
    });
  } catch (error: any) {
    console.error(
      "[Daily Digest API] Error occurred during generation/execution:",
      error,
    );

    // Update status to failed in DB if userId is available
    if (userId) {
      try {
        await convex.mutation(api.dailyDigest.updateDigestStateInternal, {
          userId,
          status: "failed",
          error:
            error.message || "Failed to generate or send daily digest briefing",
        });
      } catch (dbErr) {
        console.error(
          "[Daily Digest API] Failed to update DB failure status:",
          dbErr,
        );
      }
    }

    // Cleanup local temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal server error during daily digest execution",
      },
      { status: 500 },
    );
  }
}
