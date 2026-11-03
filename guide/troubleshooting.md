# Troubleshooting

Common issues and solutions when using TOSE CLI.

## Installation Issues

### Command Not Found

If `tose: command not found` appears after installation:

**Solution:**
```bash
# Check npm global bin path
npm config get prefix

# Add to PATH
export PATH="$PATH:$(npm config get prefix)/bin"
source ~/.bashrc
```

### Permission Errors

**Solution:**
```bash
# Use sudo (not recommended)
sudo npm install -g @tosesh/tose

# Or configure npm to use different directory (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Authentication Issues

### API Key Invalid

**Symptoms:** "Invalid API key" error

**Solutions:**
1. Verify key starts with `tose_sk_`
2. Check key in dashboard hasn't expired
3. Remove cached config and try again:
   ```bash
   rm ~/.tose/config.json
   tose up
   ```

### Workspace Not Found

**Solution:**
```bash
# Remove cached workspace
rm ~/.tose/config.json
tose up
```

## Deployment Issues

### Git Repository Not Detected

**Solutions:**
1. Check you're in a Git repository:
   ```bash
   git status
   ```
2. Verify remote exists:
   ```bash
   git remote -v
   ```
3. Manually enter URL when prompted

### Deployment Fails

**Solutions:**
1. Check logs for specific errors:
   ```bash
   tose logs -n 200
   ```
2. Verify environment variables are correct
3. Check application port matches your app
4. Ensure Git repository is accessible

### Build Errors

**Common causes:**
- Missing dependencies in package.json
- Syntax errors in code
- Incorrect build command

**Solution:**
```bash
# Review build logs
tose logs --follow

# Test build locally first
npm run build
```

## Configuration Issues

### Config File Corrupted

**Solution:**
```bash
# Backup and recreate
mv ~/.tose/config.json ~/.tose/config.json.backup
tose up
```

### Environment Variables Not Applied

**Solutions:**
1. Verify .env files were selected during deployment
2. Check variable names (case-sensitive)
3. Redeploy to apply changes:
   ```bash
   tose up
   # Select "Redeploy"
   ```

## Network Issues

### Connection Timeout

**Solutions:**
1. Check internet connection
2. Verify firewall isn't blocking
3. Try different network
4. Check API status at status.tose.sh

### SSL/TLS Errors

**Solution:**
```bash
# Update Node.js to latest LTS version
# Or temporarily disable SSL verification (not recommended)
NODE_TLS_REJECT_UNAUTHORIZED=0 tose up
```

## Log Issues

### No Logs Available

**Solutions:**
1. Verify deployment exists:
   ```bash
   tose status
   ```
2. Wait a few moments for logs to generate
3. Check deployment ID is correct

### Logs Stop Streaming

**Solution:**
- Press Ctrl+C and restart:
  ```bash
  tose logs --follow
  ```

## Performance Issues

### Slow Deployment

**Common causes:**
- Large dependencies
- Slow Git clone
- Complex build process

**Solutions:**
- Optimize package.json dependencies
- Use `.npmrc` for faster installs
- Enable caching in build process

## Getting Help

If issues persist:

1. **Check Documentation**
   - [Installation Guide](/guide/installation)
   - [Getting Started](/guide/getting-started)
   - [Commands Overview](/commands/overview)

2. **Search GitHub Issues**
   - [GitHub Issues](https://github.com/tosesh/tose/issues)
   - Check if issue already reported

3. **Create New Issue**
   - Provide TOSE CLI version: `tose --version`
   - Include error messages
   - Describe steps to reproduce

4. **Contact Support**
   - Email: tobi@wearetopgroup.com
   - Include relevant logs and error messages

## Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set debug environment variable
DEBUG=* tose up

# Or check config for debug option
cat ~/.tose/config.json
```

## Common Error Messages

### "Project not found"

**Solution:** Verify project ID or slug is correct:
```bash
tose status
# Select from list
```

### "Deployment already in progress"

**Solution:** Wait for current deployment to complete or cancel it:
```bash
tose down --force
tose up
```

### "INSUFFICIENT_BALANCE" (HTTP 402) {#insufficient-balance}

Your workspace wallet balance is zero or negative, so TOSE refuses to deploy, redeploy or roll back. The dashboard and API return HTTP `402` with the code `INSUFFICIENT_BALANCE` and create no deployment. A GitHub push or a project's first deploy creates a deployment that ends as `failed` with `insufficient wallet balance` before the build starts. An agent over MCP gets `INSUFFICIENT_BALANCE` when it asks for the plan.

**Solution:** top up the wallet from the dashboard billing page, then deploy again. See [When the balance is zero](/guide/pricing#when-the-balance-is-zero).

### "Port already in use"

**Solution:** Change port in configuration:
```bash
tose up
# Enter different port when prompted
```

## Best Practices to Avoid Issues

1. **Keep TOSE CLI Updated**
   ```bash
   npm update -g @tosesh/tose
   ```

2. **Commit Before Deploying**
   ```bash
   git add .
   git commit -m "message"
   git push
   ```

3. **Test Locally First**
   ```bash
   npm install
   npm run build
   npm start
   ```

4. **Use Correct Environment Files**
   - Development: `.env`, `.env.local`
   - Production: `.env`, `.env.production`

5. **Monitor Deployments**
   ```bash
   tose logs --follow
   ```

## Related Resources

- [Installation](/guide/installation)
- [Getting Started](/guide/getting-started)
- [Configuration](/guide/configuration)
- [GitHub Issues](https://github.com/tosesh/tose/issues)
