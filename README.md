# dtao-cli

Scaffold full-stack projects (React + TypeScript, FastAPI, MongoDB, Docker Compose) and add reusable feature bricks with one command.

## Install

```
npm install -g @dtaoofficial/dtao-cli
```

## Usage

```
dtao init
cd <project-name>
dtao add login
docker compose up -d --build
```

`dtao init` scaffolds a new project (frontend, backend, Dockerfiles, docker-compose) and asks for a project name and database.

`dtao add <component>` copies a feature's frontend + backend code into your project, wires it into existing files where needed, and (with confirmation) starts Docker and runs any setup steps.

Components are pulled from a private registry — access is controlled by your own git/GitHub credentials, not by anything in this package.
