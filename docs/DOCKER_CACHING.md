# Docker Build Caching Strategy

## Problem
Previously, Docker builds were inefficient because:
1. **Backend Dockerfile** copied all files before installing dependencies, causing dependency reinstallation on every code change
2. No cache invalidation mechanism when source code changed but dependencies remained the same
3. Builds took unnecessarily long even for small code changes

## Solution

### 1. Optimized Layer Ordering
Both backend and frontend Dockerfiles now follow best practices:

**Backend (`backend/Dockerfile`):**
```dockerfile
# Copy only requirements first (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy source code last (only invalidates this layer on code changes)
COPY . .
```

**Frontend (`frontend/Dockerfile`):**
```dockerfile
# Copy only package files first (cached unless package.json changes)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code last (only invalidates this layer on code changes)
COPY . .
```

### 2. Git Commit Hash for Cache Busting
Added `GIT_COMMIT` build argument to ensure fresh builds when code changes:

```dockerfile
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
```

This is automatically passed during deployment via Ansible, which retrieves the current git commit hash.

### 3. Deployment Integration
The Ansible playbook (`deployment/ansible/deploy.yml`) now:
1. Gets the current git commit hash from the local repository
2. Passes it as an environment variable to docker compose build
3. Ensures builds use the correct cache layers

## Benefits

✅ **Faster builds**: Dependencies are only reinstalled when requirements change  
✅ **Efficient caching**: Source code changes don't invalidate dependency layers  
✅ **Automatic cache busting**: Git commit hash ensures fresh builds when needed  
✅ **Consistent deployments**: Same commit = same build  

## Usage

### Local Development
```bash
# Build with automatic git commit hash
export GIT_COMMIT=$(git rev-parse --short HEAD)
docker compose build
```

### Production Deployment
The Ansible playbook handles this automatically:
```bash
cd deployment
./start_ansible.sh
```

## Cache Behavior

| Change Type | Layers Rebuilt | Time Impact |
|------------|----------------|-------------|
| Source code only | Source code layer only | ~10-30 seconds |
| Dependencies only | Dependencies + source code | ~2-5 minutes |
| Both | All layers | ~2-5 minutes |
| No changes | None (uses cache) | ~5-10 seconds |

## Troubleshooting

### Force rebuild without cache
```bash
docker compose build --no-cache backend
docker compose build --no-cache frontend
```

### Check current git commit in container
```bash
docker exec finance_backend env | grep GIT_COMMIT
```

### Verify layer caching
```bash
docker compose build backend 2>&1 | grep "CACHED"
```

