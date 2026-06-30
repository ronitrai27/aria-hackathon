# 🐳 Docker Engineering Guide (Learning Reference)

This document explains the design patterns and security practices used in the Dockerfiles for this project, specifically detailing **Multi-Stage Builds**, **Non-Root Security**, and **Container Orchestration**.

---

## 1. What is a Multi-Stage Build?

In standard Docker builds, every instruction (`RUN`, `COPY`, `ADD`) creates a new layer in the image. If you install compilers, fetch dependencies, and build binaries in a single image, all those build tools (like `gcc`, `g++`, `git`, `make`) remain in the final image, making it massive (often 1.5GB+) and increasing the attack surface.

**Multi-Stage Builds** solve this by using multiple `FROM` statements in a single Dockerfile. Each `FROM` starts a fresh stage with a new base image. You can copy files and artifacts from one stage to another, leaving all build-time bloat behind.

### 🐍 The Python Backend Stage Breakdown (`agents/Dockerfile`)
The backend uses a **2-stage build**:
1. **Stage 1 (`builder`)**:
    - Starts with `python:3.12-slim` and installs heavy build headers (`build-essential`, `git`, `curl`) and Poetry.
    - Resolves dependencies and builds a localized virtual environment (`.venv`) inside `/app`.
2. **Stage 2 (`runner`)**:
    - Starts with a clean, lightweight `python:3.12-slim` base image.
    - It **only copies** the pre-compiled `.venv` folder from the `builder` stage:
      ```dockerfile
      COPY --from=builder /app/.venv /app/.venv
      ```
    - Downloads spaCy NLP models directly inside the runner image.
    - **Result**: The final image does not contain Poetry, build tools, or compile cache, leaving a highly optimized runtime image.

### ⚡ The Next.js Frontend Stage Breakdown (`client/Dockerfile`)
The frontend uses a **3-stage build** designed for Node/Next.js standalone deployments:
1. **Stage 1 (`deps`)**:
    - Installs system libraries and runs `pnpm install` to download all dependencies.
2. **Stage 2 (`builder`)**:
    - Copies the node modules from Stage 1, injects the build-time environment variables, and runs `pnpm run build` (Next.js compilation).
    - Next.js traces the imports and compiles the application into a standalone Node.js folder (`.next/standalone`).
3. **Stage 3 (`runner`)**:
    - Starts with a fresh, secure `node:20-alpine` image.
    - Copies only the static assets (`public/` and `.next/static/`) and the compiled server runner (`.next/standalone/`).
    - **Result**: Drops the Next.js runtime image size from ~1.5GB down to around **100MB**, as it does not pack devDependencies or source TypeScript code.

---

## 2. What is "Non-Root" Execution?

By default, Docker containers run processes as the `root` user. If an attacker finds a vulnerability in your web application (like a Remote Code Execution bug) and gets command-line access inside the container, they inherit `root` privileges. This allows them to read sensitive files, modify binaries, or potentially escape the container to compromise the underlying host server.

**Non-Root execution** runs the application process under a standard, unprivileged user.

### How it is configured in the Next.js Dockerfile:
We create a system group and user, and then instruct Docker to switch to that user:
```dockerfile
# 1. Create a system group with Group ID (GID) 1001
RUN addgroup --system --gid 1001 nodejs

# 2. Create a system user with User ID (UID) 1001 assigned to the nodejs group
RUN adduser --system --uid 1001 nextjs

# 3. Copy files and change ownership to the nextjs user
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 4. Switch the execution context to the unprivileged user
USER nextjs
```
Now, if a security vulnerability is exploited, the attacker only has access as `nextjs`, a user with zero write privileges outside `/app` and no system admin capabilities.

---

## 3. How to Build and Pass Build Arguments

### Next.js Build-Time Variables (`NEXT_PUBLIC_`)
In Next.js, any environment variable prefixed with `NEXT_PUBLIC_` is baked directly into the static HTML/JavaScript bundles during the build phase (`next build`). Because of this, they cannot be set at runtime; they **must** be supplied while building the container image.

We do this using Docker **Build Arguments** (`ARG`):
1. In the `Dockerfile` we define the arguments:
    ```dockerfile
    ARG NEXT_PUBLIC_CONVEX_SITE_URL
    ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
    ```
2. During build time, we pass them via `--build-arg`:
    ```bash
    docker build -t aria-client:latest \
      --build-arg NEXT_PUBLIC_CONVEX_SITE_URL="https://wandering-antelope-3.convex.site" \
      --build-arg UPSTASH_REDIS_REST_URL="https://..." \
      --build-arg UPSTASH_REDIS_REST_TOKEN="..." \
      .
    ```

### FastAPI Dynamic Ports
Unlike Next.js, the FastAPI backend environment variables are read at **runtime**. When running the container, you specify these variables with `-e`:
```bash
docker run -d \
  -p 8000:8000 \
  -e REDIS_URL="your-upstash-redis-url" \
  aria-agents:latest
```
Cloud Run automatically binds to the `PORT` environment variable. Our entrypoint code handles this dynamically:
```python
port = int(os.environ.get("PORT", 8000))
uvicorn.run("main:app", host="0.0.0.0", port=port)
```
This ensures that whether Cloud Run sets `PORT` to `8080`, `8000`, or any random port, the server binds to it perfectly.
