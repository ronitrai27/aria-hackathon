import os
import json
from composio import ComposioToolSet

def main():
    api_key = "ak_MPFo1BPP0n9TfmfQbmKn"
    print("Initializing ComposioToolSet...")
    toolset = ComposioToolSet(api_key=api_key)
    
    print("Getting actions for Gmail...")
    # Get all actions for GMAIL
    try:
        # In newer Composio SDKs, actions are retrieved via toolset.get_tools or toolset.get_actions
        # Let's inspect the object properties and list them
        actions = toolset.get_actions()
        print(f"Total actions returned: {len(actions)}")
        
        gmail_actions = []
        for action in actions:
            # Action is an Enum or object
            # Let's print one action representation to see what it is
            name = str(action)
            if "gmail" in name.lower():
                gmail_actions.append(name)
                
        print(f"Total Gmail actions: {len(gmail_actions)}")
        print("First 20 Gmail action names:")
        for name in gmail_actions[:20]:
            print(f" - {name}")
            
    except Exception as e:
        print(f"Error: {e}")
        # Try fallback using the low-level client if available
        try:
            print("Trying low-level Composio client...")
            from composio.sdk.core import Composio
            client = Composio(api_key=api_key)
            # Fetch tools via HTTP client
            tools = client.tools.get(toolkit_slug="gmail")
            print(f"Tools response: {tools}")
        except Exception as ex:
            print(f"Secondary error: {ex}")

if __name__ == "__main__":
    main()
