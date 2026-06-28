[set_workflow called] name='Research AI trends, save to doc, and email' steps=4 total_fields=8

============================================================
  WORKFLOW: Research AI trends, save to doc, and email
  DESC:     Research latest AI trends, generate a write-up, create a Google Doc with the content, and email it to you via Gmail (with optional attachment).
============================================================
  Step 1: AI_RESEARCH — Research the latest AI trends and produce a structured write-up.
    • prompt (string) = 'Research the latest AI trends from the past 6–12 months. Focus on: (1) frontier models (e.g., GPT-4-class, Claude, Gemini, open-source LLMs), (2) multimodal AI (text+image+audio+video), (3) AI coding and agentic workflows, (4) AI in productivity tools, (5) regulation and safety, (6) notable startups and open-source projects. Produce a concise, well-structured report with sections, bullet points, and brief examples where useful.'  # Instructions for the AI about what to research.
  Step 2: AI_SUMMARIZE — Convert the detailed research into a cleaner report for the document.
    • prompt (string) = "You are preparing content for a Google Doc. Using the research below, produce a polished report titled 'Latest AI Trends'. Use clear headings, short paragraphs, and bullet lists where helpful. Keep it suitable for a non-expert but technically curious reader. Input:\n\n{{step_1}}"  # Instructions for the AI to summarize or reorganize previous output.      
  Step 3: GOOGLEDRIVE_CREATE_GOOGLE_DOC — Create a new Google Doc and populate it with the AI trends report.
    • title (string) = 'Latest AI Trends'  # Title of the new Google Doc.
    • content_markdown (string) = '{{step_2}}'  # Markdown or text content to place into the Google Doc body.
  Step 4: GMAIL_SEND_EMAIL — Email the AI trends Google Doc (link or attachment) to your email address.
    • recipient_email (string) = ''  # Your email address to receive the report.
    • subject (string) = 'Latest AI Trends Report'  # Email subject line.
    • body (string) = 'Here is your report on the latest AI trends.\n\nGoogle Doc link: {{step_3}}\n\nIf you’d like, you can also download and keep it for your records.'  # Email body text. You can include the Google Doc link from the previous step.
    • is_html (boolean) = False  # Whether the email body is HTML formatted.
============================================================

[verifier_node] Validating proposed workflow 'Research AI trends, save to doc, and email'...
[verifier_node] Pydantic schema structure check passed.
[verifier_node] Validation SUCCESS. Committing workflow 'Research AI trends, save to doc, and email' to active state.
[agent_node] Running agent without validation errors.
[should_continue] No tool calls. Routing to END.
[run_workflow_agent_stream] Stream complete.
---------------

mistake 
GOOGLEDOCS_CREATE_DOCUMENT (takes title to initialize a blank document)
GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN (takes title and markdown to initialize a document with pre-filled content)
