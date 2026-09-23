# dtao project

Scaffolded with [dtao](https://ui.dtaoofficial.com).

## Running it

```
docker compose up -d --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8001
- MongoDB: localhost:27017

## Adding a component

```
npx dtao add <component-name>
```

## Port already in use?

If another project on your machine already uses one of the ports above, `docker compose up` will
fail with `address already in use`. Fix it by remapping just the conflicting port — you don't need
to change anything else:

1. In `docker-compose.yml`, change the **host** side of the port mapping for the conflicting
   service, e.g. `"5173:5173"` → `"5183:5173"` (the container-side port after the colon stays the
   same).
2. If you remapped the **frontend** port, also update `backend/.env`'s `CORS_ORIGINS` and
   `FRONTEND_URL` to match (e.g. `http://localhost:5183`), then run
   `docker compose up -d --force-recreate backend` — a plain `restart` does not re-read `.env`.
3. If you remapped the **backend** port, also update `frontend/.env`'s `VITE_API_URL` to match.

Then visit the app at whichever host port you chose for the frontend.
