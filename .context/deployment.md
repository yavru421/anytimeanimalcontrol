# Deployment Architecture
- **Host**: Cloudflare Pages
- **Build Script**: `build.sh` executed via `npm run build`
- **Constraints**: Do not use AOT compilation or `wasm-tools`. Cloudflare container fails to resolve `emcc`. `build.sh` uses `dotnet publish -c Release -o output -p:UsingBrowserRuntimeWorkload=false` and sets `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`.
