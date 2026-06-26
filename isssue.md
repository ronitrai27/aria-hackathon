26/6/2026, 11:19:20 am [CONVEX A(crons:runScheduledFetch)] [ERROR] '[Cron] SITE_URL is not configured'

------------
[browser] Failed to auto-save workflow: TypeError: Cannot read properties of undefined (reading 'length')
    at Array.map (<anonymous>)
    at AgentPage.useEffect.delayDebounce (src/app/(main)/home/agent/page.tsx:196:26)
  194 |     const delayDebounce = setTimeout(async () => {
  195 |       try {
> 196 |         const id = await saveWorkflow({
      |                          ^
  197 |           name: workflowTitle,
  198 |           description: "Designed workflow graph",
  199 |           structure: { (src/app/(main)
[browser] Failed to auto-save workflow: TypeError: Cannot read properties of undefined (reading 'length')
    at Array.map (<anonymous>)
    at AgentPage.useEffect.delayDebounce (src/app/(main)/home/agent/page.tsx:196:26)
  194 |     const delayDebounce = setTimeout(async () => {
  195 |       try {
> 196 |         const id = await saveWorkflow({
      |                          ^
  197 |           name: workflowTitle,
  198 |           description: "Designed workflow graph",
  199 |           structure: { (src/app/(main)
[API /workflow-trigger] Executing AI step. Role: research, Provider: openai, Format: rich
[API /workflow-trigger] Unexpected error: Error [AI_APICallError]: Invalid schema for function 'search_web': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
    at async POST (src\app\api\ai-vercel\workflow-trigger\route.ts:195:20)
  193 |
  194 |     // Call generateText using gpt-4.1-nano
> 195 |     const result = await generateText({
      |                    ^
  196 |       model,
  197 |       system: systemPrompt,
  198 |       prompt: prompt, {
  cause: undefined,
  url: 'https://api.openai.com/v1/responses',
  requestBodyValues: {
    model: 'gpt-4.1-nano',
    input: [ [Object], [Object] ],
    temperature: undefined,
    top_p: undefined,
    max_output_tokens: undefined,
    conversation: undefined,
    max_tool_calls: undefined,
    metadata: undefined,
    parallel_tool_calls: undefined,
    previous_response_id: undefined,
    store: undefined,
    user: undefined,
    instructions: undefined,
    service_tier: undefined,
    include: undefined,
    prompt_cache_key: undefined,
    prompt_cache_retention: undefined,
    safety_identifier: undefined,
    top_logprobs: undefined,
    truncation: undefined,
    tools: [ [Object], [Object] ],
    tool_choice: 'auto'
  },
  statusCode: 400,
  responseHeaders: {
    'access-control-expose-headers': 'X-Request-ID, CF-Ray, CF-Ray',
    'alt-svc': 'h3=":443"; ma=86400',
    'cf-cache-status': 'DYNAMIC',
    'cf-ray': 'a11b2aab1dd78aee-DEL',
    connection: 'keep-alive',
    'content-length': '269',
    'content-type': 'application/json',
    date: 'Fri, 26 Jun 2026 09:25:48 GMT',
    'openai-organization': 'user-f63cykyperctajfjc7xrehqa',
    'openai-processing-ms': '29',
    'openai-project': 'proj_uTrcOUblpV0j4j4uvMEWwqWh',
    'openai-version': '2020-10-01',
    server: 'cloudflare',
    'set-cookie': '__cf_bm=ZaHRrCwdoc1qWRAqju546ghQLe2cfPnFTW8YeZ0em9Q-1782465947.3769305-1.0.1.1-zkGeK3hSscpB5MpYP9s16pN2WGjFNFb30diAK1qVVOP0rZFuGKayj8ASCIeX6NnRAuwQRyAGGzt6KipXfFHHEbcITcxL3teut0IzL6pFWqOtxnUeKhJuUHWqJB9cHNwo; HttpOnly; SameSite=None; Secure; Path=/; Domain=api.openai.com; Expires=Fri, 26 Jun 2026 09:55:48 GMT',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'x-request-id': 'req_00ad6240f41a4a198a0f1cc3a25a6f76'
  },
  responseBody: '{\n' +
    '  "error": {\n' +
    `    "message": "Invalid schema for function 'search_web': schema must be a JSON Schema of 'type: \\"object\\"', got 'type: \\"None\\"'.",\n` +
    '    "type": "invalid_request_error",\n' +
    '    "param": "tools[0].parameters",\n' +
    '    "code": "invalid_function_parameters"\n' +
    '  }\n' +
    '}',
  isRetryable: false,
  data: {
    error: {
      message: `Invalid schema for function 'search_web': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.`,
      type: 'invalid_request_error',
      param: 'tools[0].parameters',
      code: 'invalid_function_parameters'
    }
  }
}
 POST /api/ai-vercel/workflow-trigger 500 in 3.9s (next.js: 767ms, proxy.ts: 96ms, application-code: 3.0s)
[browser] AI Node Execution error: Error: Invalid schema for function 'search_web': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
    at AgentPage.useEffect.runAINode (src/app/(main)/home/agent/page.tsx:454:19)
  452 |
  453 |           if (!res.ok || result.error) {
> 454 |             throw new Error(result.error || "AI Node Execution failed");
      |                   ^
  455 |           }
  456 |
  457 |           // Save traceResult on the node (src/app/(main)
[browser] Failed to auto-save workflow: TypeError: Cannot read properties of undefined (reading 'length')
    at Array.map (<anonymous>)
    at AgentPage.useEffect.delayDebounce (src/app/(main)/home/agent/page.tsx:196:26)
  194 |     const delayDebounce = setTimeout(async () => {
  195 |       try {
> 196 |         const id = await saveWorkflow({
      |                          ^
  197 |           name: workflowTitle,
  198 |           description: "Designed workflow graph",
  199 |           structure: { (src/app/(main)
