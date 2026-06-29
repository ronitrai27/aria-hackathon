async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("COMPOSIO_API_KEY not found in process.env");
    return;
  }
  
  const url = `https://api.composio.dev/api/v3.1/tools?toolkit_slug=gmail&limit=200`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const sendEmailAction = data.items?.find(a => a.name.toLowerCase().includes("send_email"));
    console.log("Found action details:");
    console.log(JSON.stringify(sendEmailAction, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
