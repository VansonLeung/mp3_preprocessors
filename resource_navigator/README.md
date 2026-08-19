# Resource Navigator

Fullscreen local browser for maritime MP3 inputs, chunk MP3s, transcripts, SRTs, and chunk analysis files.

## Development

```bash
cd resource_navigator
npm install
npm run dev
```

Frontend dev server:

```text
http://127.0.0.1:5173
```

Backend API server:

```text
http://127.0.0.1:4174
```

## Production

```bash
cd resource_navigator
npm run build
npm start
```

Open:

```text
http://127.0.0.1:4174
```

## Safety Boundary

The backend serves only paths under:

```text
inputs/
outputs/
```

Requests such as `../.env` are rejected by `SafeWorkspacePathAdapter`.
