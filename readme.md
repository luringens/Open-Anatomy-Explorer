# INF319 Project

## Compiling

```sh
npx webpack
```

## Hosting with live reload for development purposes

```sh
# First setup
npm install -g browser-sync

# Running
cd dist
browser-sync start -s -f . --no-notify --host 127.0.0.1 --port 8000
```
