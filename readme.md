# INF319 Project

## Ideas for future improvement:

- Orientation questions
- Free-text questions
- Larger brush size
- Link labels to information sites
- Name this region:
  - Only display the label in question
  - Disable moving light fixture
- Read-only quizzes

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
