import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const customOpenai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = customOpenai("gpt-4.1-nano");

// -----------------------------------------------------------------------------
// POST Route Handler
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, prompt, extraInstructions, format, provider } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required parameter: prompt" },
        { status: 400 },
      );
    }

    console.log(
      `[API /workflow-trigger] Executing AI step. Role: ${role}, Provider: ${provider}, Format: ${format}`,
    );

    const formatInstruction =
      format === "rich"
        ? "Output the result in beautiful markdown format, including headings, lists, bold text, etc., as appropriate."
        : "Output the result as simple, unformatted plain text. Do not use markdown tags, headers, bold markup, or bullet symbols.";

    const extraPrompt = extraInstructions
      ? `\nAdditional instructions to follow strictly:\n${extraInstructions}`
      : "";

    let systemPrompt = "";

    switch (role) {
      case "summarize":
        systemPrompt = `You are a precise text summarization agent.\nYour goal is to summarize the provided input text. ${formatInstruction}${extraPrompt}`;
        break;
      case "classify":
        systemPrompt = `You are a text classification agent.\nYour task is to classify the input text into appropriate categories. ${formatInstruction}${extraPrompt}`;
        break;
      case "extract":
        systemPrompt = `You are a data extraction agent.\nYour task is to extract structured entities, facts, or information from the input text. ${formatInstruction}${extraPrompt}`;
        break;
      case "research":
        systemPrompt = `You are a research agent.\nYour task is to research and answer the given topic or query as comprehensively as possible using your knowledge. ${formatInstruction}${extraPrompt}`;
        break;
      default:
        systemPrompt = `You are a helpful AI assistant.\nYour task is to respond to the prompt. ${formatInstruction}${extraPrompt}`;
    }

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt,
    });

    console.log(
      `[API /workflow-trigger] Result: ${result.text.slice(0, 100)}...`,
    );

    return NextResponse.json({
      result: result.text,
    });
  } catch (error: any) {
    console.error("[API /workflow-trigger] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
