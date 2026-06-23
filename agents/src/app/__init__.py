"""
app package — top-level package for the Aria agent system.

Structure:
    app/
    ├── agent/    — Supervisor node, graph builder, worker nodes
    ├── schema/   — AriaState, WorkerResult, Literal types
    ├── tool/     — @tool definitions used by workers
    └── utils/    — shared helpers (config, logging, formatters)
"""
