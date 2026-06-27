
[POST /agent] Match /agent Route. userId: j575q101a4sycsnngr0kxz8hz5897wwm, query: 'create me a solid flow to reseaech latest startups from hacker news , new videos from yc from youtube and ai to summarize those and send me email and draft a post in linkedin', thread_id: thread_1782562555767_bkpmhy6
INFO:     127.0.0.1:54365 - "POST /agent HTTP/1.1" 200 OK
[event_stream] Initializing Composio session for user: j575q101a4sycsnngr0kxz8hz5897wwm

[compile_workflow_agent] Composio meta-tools loaded: ['COMPOSIO_MANAGE_CONNECTIONS', 'COMPOSIO_MULTI_EXECUTE_TOOL', 'COMPOSIO_SEARCH_TOOLS', 'COMPOSIO_GET_TOOL_SCHEMAS']

[run_workflow_agent_stream] Starting agent run for thread_id=thread_1782562555767_bkpmhy6
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_GET_TOOL_SCHEMAS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['COMPOSIO_SEARCH_TOOLS']
[verifier_node] No proposed workflow staged. Skipping validation.
[agent_node] Running agent without validation errors.
[should_continue] Routing to tools. Calls: ['set_workflow']

[set_workflow called] name='HN + YC digest → Email draft + LinkedIn post' steps=7 total_fields=13

============================================================
  WORKFLOW: HN + YC digest → Email draft + LinkedIn post
  DESC:     Find latest startup posts on Hacker News and recent YC videos, summarize them with AI, create an email draft and prepare a LinkedIn post draft.
============================================================
  Step 1: AI_RESEARCH — Find latest Hacker News posts (top / new / Show HN) about startups and return a short structured list.
    • prompt (string) = 'Search Hacker News (news.ycombinator.com) for the most recent and relevant posts about startups. Return up to 10 items as a JSON array with these fields for each item: {"title": string, "url": string, "hn_type": one of ["top","new","show_hn"], "points": string or number if available, "comments": string or number if available, "one_line": one-sentence summary explaining why this is interesting to startup builders}. Prefer posts from the last 7 days, but include any outstanding Show HN threads. Output ONLY the JSON array.'  # Instructions for the AI
  Step 2: AI_RESEARCH — List recent Y Combinator (YC) YouTube uploads relevant to startups and collect video metadata.
    • prompt (string) = 'List recent videos published on the official Y Combinator YouTube channel (or Y Combinator-related YC channels). Return up to 10 videos as a JSON array with: {"title": string, "url": string, "video_id": string, "publish_date": ISO-8601 date if available, "one_line": 1-line description of the video}. Focus on new uploads (last 30 days preferred). Output ONLY the JSON array.'  # Instructions for the AI
  Step 3: AI_RESEARCH — Retrieve or locate transcripts/captions for the YC videos from step 2 (or indicate if unavailable).
    • prompt (string) = 'For each video from {{step_2}} (the YC videos list), attempt to locate a transcript or captions and return a JSON mapping array: [{"video_id": string, "transcript": string_or_null, "transcript_source_url": string_or_null, "note": short note if transcript not found}]. If a full transcript is available, include the full text. If only captions/auto-captions or an external summary link exist, provide the best available text or a link and mark transcript as null. Output ONLY the JSON array.'  # Instructions for the AI
  Step 4: AI_SUMMARIZE — Summarize HN posts + YC video transcripts into an email digest and LinkedIn post draft.
    • prompt (string) = 'Using the Hacker News items in {{step_1}} and the video transcripts from {{step_3}}, produce two outputs in JSON: {"email_digest": string, "linkedin_post": string}. Email digest: a concise HTML-friendly summary (3-7 bullet highlights, each with one-sentence context and link) plus a short conclusion and suggested subject line. LinkedIn_post: a single post up to 700 characters (or up to 3000 if you prefer) suitable for public sharing that highlights the top 2–3 items and links. Also include a 1-line CTA suggestion. Output ONLY valid JSON with those two fields.'  # Instructions for the AI
  Step 5: GMAIL_CREATE_EMAIL_DRAFT — Create a Gmail draft containing the research digest (so you can review before sending).
    • recipient_email (string) = ''  # Primary recipient's email address (fill in who should receive the digest).
    • subject (string) = 'Startup digest — Hacker News + YC videos'  # Email subject line.
    • body (string) = '{{step_4.email_digest}'  # Email body content (plain text or HTML). Prefill with the email digest from the AI summary step.
    • is_html (boolean) = 'true'  # Set to True if the body contains HTML.
    • user_id (string) = 'me'  # Email account to use; 'me' uses the authenticated user.
  Step 6: LINKEDIN_GET_MY_INFO — Fetch your LinkedIn profile info to determine the author URN for posting (used by the next step).     
  Step 7: LINKEDIN_CREATE_LINKED_IN_POST — Create (or save as DRAFT) a LinkedIn post using the AI-generated post text.
    • author (string) = ''  # URN of the LinkedIn member or organization that will be the author (use the URN returned by LINKEDIN_GET_MY_INFO, e.g., 'urn:li:person:<id>').
    • commentary (string) = '{{step_4.linkedin_post}'  # The main text content of the post. Prefill with the linkedin_post output from the summarization step.
    • visibility (string) = 'PUBLIC'  # Who can see the post. Use 'PUBLIC' for everyone.
    • lifecycleState (string) = 'DRAFT'  # Set to 'DRAFT' to save as a draft or 'PUBLISHED' to publish immediately.
============================================================

[verifier_node] Validating proposed workflow 'HN + YC digest → Email draft + LinkedIn post'...
[verifier_node] Pydantic schema structure check passed.
[verifier_node] Validation SUCCESS. Committing workflow 'HN + YC digest → Email draft + LinkedIn post' to active state.
[agent_node] Running agent without validation errors.
[should_continue] No tool calls. Routing to END.
[run_workflow_agent_stream] Stream complete.