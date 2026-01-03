# `jotcompose`: Notetaking Service as a Compose Stack

Notes REST API service running inside a Docker Compose stack. Jot down your notes,
save them in your notebooks, and enjoy the easy portability of having it all in one
Compose stack.

Built as a milestone project for the Docker section of Lauro's 
[Complete Docker & Kubernetes Course on Udemy](https://www.udemy.com/course/complete-docker-kubernetes).

## Table of Contents

- [Background](#background)
- [Overview](#overview)
- [Deployment](#deployment)
- [Built With](#built-with)
- [License](#license)

## Background

During my onboarding @ Redis, I had a few skill gaps to close. One of them was
Docker and Kubernetes, so I bought a [hands-on course on Udemy](https://www.udemy.com/course/complete-docker-kubernetes).

The final section on Docker ends with a Compose project to build a simple notetaking
service. I decided to take it one step further and use the project as a systems design
exercise in microservices as well.

## Overview

`jotcompose` is composed of 3 microservices:
- `notebooks` REST API service for storing notebooks with notes
- `notes` REST API service for storing individual notes
- `reverse-proxy` reverse proxy to route user requests

`notebooks` and `notes` both have individual data stores and act as simple CRUD services.
Their APIs are only accessible via `reverse-proxy`'s exposed public endpoint.

The entire system is managed by [Compose](https://docs.docker.com/compose/) inside
[Docker](https://www.docker.com/) containers.

More on the system's design can be found inside [system-design.md](system-design.md)

## Deployment

Clone the repo and `up` the Compose stack.

### Prerequisites

- [Docker](https://www.docker.com/) version 29.1+
- [Docker Compose](https://docs.docker.com/compose/) version v2.40+

### Setup

Run the setup script.

```bash
chmod +x scripts/setup.sh
bash scripts/setup.sh
```

This will create `.env` files with necessary environment variables. You may keep
the default values - the Compose stack will work with them.

UP the Compose stack.

```bash
docker compose up -d
```

**NOTE**: Ports used on your host machine:
- `nginx` on port **8888**

Edit [compose.yaml](compose.yaml) if the listed ports are already in use.

### Verify

Ensure both services are up and running healthily.

```bash
# Both services return text "up" with code 200
curl http://localhost:8888/health/notes -v
curl http://localhost:8888/health/notebooks -v
```

### Seed data

You may seed some sample service data via:

```bash
chmod +x scripts/seed.sh
bash scripts/seed.sh
```

### Load test

[`scripts/load_test.sh`](scripts/load_test.sh) runs concurrent requests for various
operations to the service:

```bash
chmod +x scripts/load_test.sh
bash scripts/load_test.sh
```

**WARNING**: the following script WILL overload the service and may overload your
host machine as well. Ensure you have at least 2 Gb of free RAM and 2 CPU cores
before running this command:

```bash
CONCURRENT_REQUESTS=100 NOTEBOOKS_TO_CREATE=500 NOTES_TO_CREATE=20000 GET_REQUESTS=10000 PUT_REQUESTS=5000 ./scripts/load_test.sh
```

## Built With

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [nginx](https://nginx.org/)

## License

This project is distributed under the [MIT license](LICENSE).
