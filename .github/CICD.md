# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Smart Summary App.

## Overview

The CI/CD pipeline is configured using GitHub Actions and includes:

1. **CI Workflows** (Continuous Integration):
   - Code testing
   - Linting
   - Build verification
   - Dependency checks

2. **CD Workflows** (Continuous Deployment):
   - Automatic deployment to Fly.io on push to main/master
   - Manual deployment via workflow_dispatch

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Pull requests to `main` or `master`
- Pushes to `main` or `master`

**Jobs:**
- **Test**: Runs all tests using `pnpm test`
- **Lint**: Runs linter on all code using `pnpm lint`
- **Build**: Builds all packages and verifies build artifacts

**Purpose:** Ensures code quality and buildability before merging or deploying.

### 2. PR Check Workflow (`pr-check.yml`)

**Triggers:**
- Pull requests to `main` or `master`

**Jobs:**
- Runs lint, test, and build checks
- Uses `continue-on-error: true` to show all results even if one fails

**Purpose:** Provides comprehensive feedback on pull requests.

### 3. Dependency Check Workflow (`dependency-check.yml`)

**Triggers:**
- Pull requests to `main` or `master`
- Weekly schedule (Monday at 00:00 UTC)
- Manual trigger via `workflow_dispatch`

**Jobs:**
- Runs `pnpm audit` to check for security vulnerabilities
- Checks for outdated packages

**Purpose:** Keeps dependencies up to date and secure.

### 4. Deploy Backend Workflow (`deploy-backend.yml`)

**Triggers:**
- Push to `main` or `master` when backend files change
- Manual trigger via `workflow_dispatch`

**Path Filters:**
- `apps/backend/**`
- `packages/types/**`
- `apps/backend/Dockerfile`
- `apps/backend/fly.toml`
- `.github/workflows/deploy-backend.yml`

**Steps:**
1. Checkout code
2. Setup Fly.io CLI
3. Deploy to Fly.io
4. Run database migrations

**Required Secrets:**
- `FLY_API_TOKEN`: Fly.io API token for authentication

**Purpose:** Automatically deploys backend changes to production.

### 5. Deploy Frontend Workflow (`deploy-frontend.yml`)

**Triggers:**
- Push to `main` or `master` when frontend files change
- Manual trigger via `workflow_dispatch`

**Path Filters:**
- `apps/frontend/**`
- `packages/types/**`
- `apps/frontend/Dockerfile`
- `apps/frontend/fly.toml`
- `.github/workflows/deploy-frontend.yml`

**Steps:**
1. Checkout code
2. Setup Fly.io CLI
3. Deploy to Fly.io

**Required Secrets:**
- `FLY_API_TOKEN`: Fly.io API token for authentication

**Purpose:** Automatically deploys frontend changes to production.

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

**Required Secret:**
- `FLY_API_TOKEN`: Generate deploy tokens for each app

To generate the tokens:
```bash
# Create token for backend
fly tokens create deploy -a smart-summary-backend

# Create token for frontend (optional - can use same token)
fly tokens create deploy -a smart-summary-frontend
```

**Note:** You can use the same token for both apps if you create an org-level token, or create separate tokens. The backend token can also deploy frontend if both apps are in the same organization.

**Important:** Copy the entire token output (it's a long string) and add it as `FLY_API_TOKEN` in GitHub Secrets.

### 2. Verify Workflows

After pushing to the repository, verify workflows are running:
1. Go to the **Actions** tab in GitHub
2. Check that workflows are triggered on push/PR
3. Verify all steps complete successfully

### 3. Test Deployment

To test deployment manually:
1. Go to **Actions** tab
2. Select a deployment workflow (e.g., "Deploy Backend to Fly.io")
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Workflow Behavior

### CI Workflows

- **Run on every PR**: Ensures code quality before merging
- **Run on push**: Validates code after merging
- **Fail fast**: Stops on first failure to save resources

### CD Workflows

- **Path-based triggers**: Only deploy when relevant files change
- **Automatic migrations**: Backend deployment runs migrations automatically
- **Manual override**: Can be triggered manually via GitHub UI

## Troubleshooting

### Workflow Failures

**Build Failures:**
- Check build logs for compilation errors
- Verify all dependencies are installed correctly
- Check for TypeScript errors

**Test Failures:**
- Review test output for failing tests
- Ensure test environment is properly configured
- Check for flaky tests

**Deployment Failures:**
- Verify `FLY_API_TOKEN` secret is set correctly
- Check Fly.io app status: `fly status -a smart-summary-backend`
- Review Fly.io deployment logs
- Ensure database is accessible

**Lint Failures:**
- Run `pnpm lint` locally to fix issues
- Check ESLint configuration
- Review linting rules

### Common Issues

**Issue: Workflow not triggering**
- Check branch name matches trigger conditions (`main` or `master`)
- Verify path filters match changed files
- Check workflow file syntax

**Issue: Fly.io deployment fails**
- Verify Fly.io CLI is installed and authenticated
- Check `FLY_API_TOKEN` is valid and has deploy permissions
- Ensure Fly.io apps exist (`smart-summary-backend`, `smart-summary-frontend`)

**Issue: Migrations fail**
- Check database connection string
- Verify migration files exist
- Review migration logs in Fly.io

## Best Practices

1. **Always test locally first**: Run tests, lint, and build before pushing
2. **Review PR checks**: Ensure all CI checks pass before merging
3. **Monitor deployments**: Check Fly.io logs after deployment
4. **Use path filters**: Deployment workflows only run when relevant files change
5. **Keep dependencies updated**: Run `pnpm audit` regularly
6. **Test migrations**: Verify migrations work in staging before production

## Workflow Status

View workflow status in:
- GitHub Actions tab
- README badges (if configured)
- Pull request status checks

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fly.io Deployment Guide](../FLY_DEPLOYMENT.md)
- [Development Guide](../docs/6-development-guide.md)

