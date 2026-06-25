[set_workflow called] name='Send Hello Message to Email and Slack' steps=2 total_fields=6

============================================================
  WORKFLOW: Send Hello Message to Email and Slack
  DESC:     This workflow sends a 'hello' message to a specified email address via Gmail and posts the same message to a specified Slack channel.
============================================================
  Step 1: GMAIL_SEND_EMAIL — Send an email with the message 'hello'
    • recipient_email (string) = ''  # Primary recipient's email address
    • subject (string) = 'Hello'  # Subject line of the email
    • body (string) = 'hello'  # Email content (plain text or HTML)
    • is_html (boolean) = False  # Set to True if the email body contains HTML tags
  Step 2: SLACK_SEND_MESSAGE — Post the message 'hello' to a Slack channel
    • channel (string) = ''  # ID or name of the Slack channel to send the message to (without #)
    • markdown_text (string) = 'hello'  # The message content in Markdown format
============================================================