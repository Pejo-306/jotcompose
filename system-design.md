# System Design for `jotcompose`

This document describes the architecture and requirements of the system `jotcompose`.

## Problem Statement

Build a Notes REST service with Docker Compose.

## Requirements

### Functional

#### FR-1: CRUD notebooks

- Users can CRUD notebooks
- Required attributes: `name`
- Optional attributes: `description`

#### FR-2: CRUD notes

- Users can CRUD individual notes
- Required attributes: `title`, `content`

#### FR-3: Attach notes to notebooks

- Users can optionally associate individual notes to a notebook

### Non-functional

#### NFR-1: `notes` availability during `notebooks` outage

- Users can continue to use `notes` service during `notebooks` outage
- Users can continue to associate notes to a notebook, even during `notebooks` outage

### Constraints

#### C-1: Microservices architecture

- The system is comprised of separate microservices for `notes` and `notebooks`
  instead of a monolith service
- An `nginx` reverse proxy to route requests to each microservice
- Only point of access is `nginx`'s publicly exposed endpoint

#### C-2: Compose runtime

- The entire service must be deployable on any single host machine with Docker Compose
- Each microservice has its own **compose.yaml**
- A repository root-level **compose.yaml** creates and manages the entire stack

#### C-3: Web engine

- Both `notes` and `notebooks` microservices use [Express](https://expressjs.com/)
  to process requests

#### C-4: Backend data store

- [MongoDB](https://www.mongodb.com/) is used as a primary data storage engine

#### C-5: Development tech stack

- [Node](https://nodejs.org/) for JavaScript runtime engine
- [npm](https://www.npmjs.com/) for package management
- [nodemon](https://nodemon.io/) for hot reloading

### Assumptions

**NOTE**: the below assumptions were retroactively added to solve various 
[technical deep dives](#technical-deep-dives).

#### A-1: Daily active users
- Assume 1 million daily active users (DAU)

#### A-2: Write volume
- Assume 1 notebook/user/week => 52 million notebooks/year
- Assume 10 notes/user/day => 3.65 billion notes/year

#### A-3: Data retention
- Assume 1 year data retention

#### A-4: String field encoding
- Assume string / text fields are stored in data stores with **UTF-8** encoding
- 1 character in **UTF-8** = 1-4 bytes
- Most characters will be stored with 1 byte (ASCII characters)
- Assume 90% of stored characters are 1 byte, 10% are stored with 4 bytes

#### A-5: Conservative string fields length
- Assume `Note.title` is 50 characters on average
- Assume `Note.content` is 4000 characters on average
- Assume `Notebook.name` is 50 characters on average
- Assume `Notebook.description` is 500 characters on average

### Non-requirements

The following is explicitly out-of-scope for this project:

- Multi-host distributed deployment
- Production-level scalability, performance, durability, availability, redundancy
- Continuous development (it's a milestone project with a tight scope)

## API Specification

### `notebooks` REST API

| Method & Endpoint                | Action            | Behavior    | 
|----------------------------------|-------------------|-------------|
| **POST** `/api/notebooks`        | Create a notebook | <ul> <li>expects `name` in request body</li>  <li>optionally receives `description` in request body</li> <li>**201**: persist notebook</li> <li>**400**: if `name` not in request body</li> </ul> |
| **GET**  `/api/notebooks`        | Get all notebooks | <ul> <li>**200**: all notebooks</li> </ul> |
| **GET**  `/api/notebooks/:id`    | Get a notebook    | <ul> <li>**200**: notebook information</li> <li>**400**: if `:id` not in request parameters</li> <li>**404**: if notebook with `:id` doesn't exist</li> </ul> |
| **PUT**  `/api/notebooks/:id`    | Update a notebook | <ul> <li>**200**: updated notebook</li> <li>**400**: if `:id` not in request parameters</li> <li>**404**: if notebook with `:id` doesn't exist</li> </ul> |
| **DELETE**  `/api/notebooks/:id` | Delete a notebook | <ul> <li>**204**: notebook deleted</li> <li>**400**: if `:id` not in request parameters</li> <li>**404**: if notebook with `:id` doesn't exist</li> <li>**503**: temporary unavailability (see [DD-5](#dd-5-responses-to-microservices-outages))</li> </ul> |
| **GET**  `/health`               | Healthcheck       | <ul> <li>**200**: with text **up**</li> </ul> |

---

### `notes` REST API

| Method & Endpoint            | Action                         | Behavior    | 
|------------------------------|--------------------------------|-------------|
| **POST** `/api/notes`        | Create a note                  | <ul> <li>expects `title` and `content` in request body</li> <li>optionally receives `notebookId` in request body</li> <li>store note with provided `notebookId` on `notebooks` outage</li> <li>**201**: persist note</li> <li>**400**: if `title` or `content` not in request body</li> <li>**404**: if notebook with `notebookId` doesn't exist</li> </ul> |
| **GET**  `/api/notes`        | Get all notes                  | <ul> <li>**200**: all notes</li> </ul> |
| **GET**  `/api/notes/:id`    | Get a note                     | <ul> <li>**200**: note information</li> <li>**404**: if note with `:id` doesn't exist</li> </ul> |
| **PUT**  `/api/notes/:id`    | Update a note                  | <ul> <li>**200**: updated note</li> <li>**404**: if note with `:id` doesn't exist</li> </ul> |
| **DELETE**  `/api/notes/:id` | Delete a note                  | <ul> <li>**204**: note deleted</li> <li>**404**: if note with `:id` doesn't exist</li> </ul> |
| **DELETE**  `/api/notes/`    | Delete all notes of a notebook | <ul> <li>**INTERNAL USE** only (see [DD-3](#dd-3-orphaned-notes))</li> <li>expects `notebookId` in request body</li> <li>**204**: notes deleted</li> <li>**404**: if `notebookId` isn't valid</li> </ul> |
| **GET**  `/health`           | Healthcheck                    | <ul> <li>**200**: with text **up**</li> </ul> |


## Data Models

### `Notebook` data model

| Field        | Type       | Required | Notes                |
|--------------|------------|----------|----------------------|
| `id`         | **string** | ✓        | <ul> <li>auto-generated</li> </ul> |
| `name`       | **string** | ✓        |                      |
| `description`| **text**   | ✗        |                      |

---

### `Note` data model

| Field        | Type       | Required | Notes                |
|--------------|------------|----------|----------------------|
| `id`         | **string** | ✓        | <ul> <li>auto-generated</li> </ul> |
| `title`      | **string** | ✓        |                      |
| `content`    | **text**   | ✓        |                      |
| `notebookId` | **string** | ✗        | <ul> <li>references `Notebook.id`</li> </ul> |


## High Level Design

![Architecture](architecture.png)

Notes:
- Each microservice is isolated in its own Docker network
- Microservices communicate internally via a shared Docker network `api-net`
- Both microservices have their own separate data stores
- Both service's data is persisted to the host machine via volumes
- Users only have access to the reverse proxy's public endpoint

## Technical Deep Dives

### DD-1: Central vs distributed data store

Do we use one central datastore or separate per-microservice data stores?

#### [REJECTED] Central data store

Keep all our data in one database which is accessible by both microservices.

**Pros**:
- If `notebooks` is down, `notes` can still validate `notebookId` associations

**Cons**:
- If data store goes down, entire application is down (single point of failure)
- Tightly couples `notes` and `notebooks` microservices. Why should they even be separate?
- May lead to performance issues as data grows
- Much harder to scale horizontally via sharding

**Rejected** due to tight coupling of microservices and scalability concerns.

#### [ACCEPTED] Separate data store for each microservice

Have a separate database for each microservice.

**Pros**:
- If one microservice goes down, the application is still partially available
- Keeps `notebooks` and `notes` decoupled
- Better isolation between responsibilities
- Easier to scale horizontally via sharding

**Cons**:
- If `notebooks` is down, `notes` can't validate `notebookId` associations.
  A compromise is required (see [DD-2](#dd-2-notes-behavior-on-notebooks-outage))
- More operational overhead (managing secrets, environment variables, etc.)

**Accepted** due to clear decoupling between microservices.

### DD-2: `notes` behavior on `notebooks` outage

On `notebooks` outage, how do we store new notes with a `notebookId`?

#### [REJECTED] Read `Notebook` data directly from Docker volume

`notebooks`'s data is stored on the host machine via a Docker volume. We can mount
the volume and read data from it directly.

**Pros**
- Can always perform `notebookId` associations

**Cons**
- Tightly couples `notes` to `notebooks` service
- `notes` now depends on:
  * MongoDB used as backend data store in `notebooks`
  * Host machine volume paths
  * `Notebook` schema

**Rejected** due to being an explicit anti-pattern.

#### [REJECTED] Add another service to asynchronously validate notes

Add a new service `validator` which is filled with notebook ids on outage.
`validator` polls the health of `notebooks`. When "up", attempt to get all
notebooks by id (via **GET** `/api/notebooks/:id`). If exists, keep the note.
If not exists, delete the note.

**Pros**
- Keeps our data store state correct & consistent

**Cons**
- Leads to unexpected data loss (from customer's POV their notes are deleted)
- `notebooks` service gets a spike in traffic on restart and may be overwhelmed
- Complicates architecture with a new microservice

**Rejected** due to data loss and complexity concerns.

#### [REJECTED] Lazily create new notebooks when `notebooks` is up

When users issue **POST** `/api/notes/`, lazily issue a **POST** `/api/notebooks/:notebookId`
in a queue. The queue is consumed by `notebooks` on "up".

**Pros**
- Retroactively creates all needed notebooks
- No data loss from customer POV

**Cons**
- Lose full control of notebook ids - now users can create notebooks with arbitrary ids
- Allowing users to control notebook ids messes up our internal schema. Now we need
  collision detection algorithms.
- Could easily be abused by a user to create notebooks unauthorized
- Leads to initial traffic spike on `notebooks` "up"

**Rejected** due to passing responsibility of internal system details to users.

#### [ACCEPTED] Cache all notebook ids and validate against cache

Add a 2-layer cache in `notes` with all notebook ids in a set:
- **fresh set** which expires every 10s
- **stale set** which never expires

On **POST** `/api/notes` check `notebookId` against the cached **fresh** set. If
`notebookId` is in the **fresh** set, store note with `notebookId`. If it's not
in the set, store note without `notebookId`.

When the **fresh** set expires, issue **GET** `/api/notebooks` to `notebooks` service
and retrieve the most current collection of notebook ids. Cache the collection both
in the **fresh** and **stale** sets (the **stale** set is a copy of **fresh** without
expiry TTL). Evaluate `notebookId` against the **fresh** set.

When **fresh** set is expired AND `notebooks` is down, evaluate `notebookId` against
the **stale** set.

**Pros**
- Guarantees `notes` can process requests with `notebookId` during `notebooks` outage
- Speeds up **POST** `/api/notes` approx. 10-1000x since we avoid API calls to `notebooks`

**Cons**
- Introduces a 10s race condition window: user creates a notebook, but new notes
  can't be associated with the notebook within the race condition window (potentially
  leads to data loss).

We handle the cons by:
- Ensuring the freshness TTL is small enough to practically avoid race conditions
  (e.g. 5-10s)
- `notes` internally retries the validation after 10s (TTL) with the newest **fresh** set

**Accepted** because it ensures optimal `notes` behavior with minimal infrastructure additions.

### DD-3: Orphaned notes

On **DELETE** `/api/notebooks/:id`, how do we handle orphaned notes (notes with a
`notebookId` that was just deleted)?

#### [REJECTED] Do nothing

Do nothing.

**Pros**
- Simple (no ON CASCADE logic required)

**Cons**
- Leads to orphaned notes (if user never explicitly deletes orphaned notes, they never get deleted)
- A motivated attacker could overflow `notes` data store with orphaned notes

**Rejected** due to security and data consistency concerns.

#### [REJECTED] Let `notes` handle cleanup

Let `notes` lazily delete notes on **GET/PUT** `/api/notes/:id` which have a deleted
`notebookId`.

**Pros**
- No data inconsistencies

**Cons**
- Hands off cleanup responsibility to another microservice
- Introduces a side effect in idempotent "safe" operations like **GET** `/api/notes/:id`
- Leads to orphaned notes (if user never queries orphaned notes, they never get deleted)
- A motivated attacker could overflow `notes` data store with orphaned notes

**Rejected** due to introduced side effects in `notes`.

#### [REJECTED] Cascade delete all orphaned notes

**GET** `/api/notes` -> filter by deleted `Notebook.id` -> **DELETE** `/api/notes/:id`

**Pros**
- Keeps `notes`'s data store lean and consistent

**Cons**
- Causes a temporary traffic spike in `notes`
  (since volume of data in `notebooks` <<< volume of data in `notes`, `notes` should
  already have high enough throughput to handle it)
- On `notebooks` outage midway through a cascade deletion, orphaned notes are left
  undeleted (will be such a rare edge case, so we can manually delete those with a nightly)

**Rejected** because there's a better solution below.

#### [ACCEPTED] Extend `notes` API with a multi-delete endpoint for cascading deletes

Add the endpoint **DELETE** `/api/notes` with expected `notebookId` in the request
body. Expose the endpoint only for internal use (no nginx route to it).

**Pros**
- Keeps `notes`'s data store lean and consistent
- Hands off cleanup responsibility to `notes` while still providing initiative
- One API call is less expensive than an array of API calls

**Cons**
- Extend `notes`'s API spec with a potentially unsafe operation (if made available to the public)

**Accepted** due to simplicity and performance with this approach.

### DD-4: `Notebook.id` and `Note.id`

What do we use as id values for `Notebook` and `Note`?

Assume [A-1](#a-1-daily-active-users), [A-2](#a-2-write-volume), and [A-3](#a-3-data-retention).

#### [REJECTED] Hash function

**Pros**
- Virtually "infinite" space

**Cons**
- Collision-prone
- Very long ids => not user or browser friendly

**Rejected** due to being collision-prone.

#### [REJECTED] UUID

**Pros**
- Virtually "infinite" space
- Collision-free

**Cons**
- Very long ids => not user or browser friendly

**Rejected** due to length.

#### [ACCEPTED] Simple counter + masking with salt and hash + multiplicative permutation + Base62 encoding

**Pros**
- O(1) time complexity
- Easy to limit length of id to desired length
- Collision-free
- Unique appearance
- Browser friendly

**Cons**
- Not extensively battle-tested

**Accepted** due to practical simplicity.

We store the counters in each respective service's backend data store. They are persisted
by the host machine's Docker volumes, so we won't lose out on data.

`notebooks` would need the following amount of characters to represent **52 mil.**
records [A-2](#a-2-write-volume):

```math
ceil(log_{62} 52 mil.) = 6
```

6 characters give us **~56 bil.** BASE62 combinations, so we could store up to
~1000 years of notebooks data. It's more than enough tolerance to avoid collisions
and running out of combinations.

`notes` would need the following amount of characters to represent **3.65 bil.**
records [A-2](#a-2-write-volume):

```math
ceil(log_{62} 3.65 bil.) = 7
```

7 characters give us **3.5 tril.** BASE62 combinations, so we could store up to
~958 years of notes data. It's more than enough tolerance to avoid collisions and
running out of combinations.

We prefix `Notebook.id` with `b`, such that ids become like: `b12hgI1`, `bBns142`, etc. 

We prefix `Note.id` with `n`, such that ids become like: `nGbIIa10`, `n910Nma6`, etc. 

We add prefixes to avoid user confusion and help the user differentiate between
notebooks and notes ids.

### DD-5: Responses to microservices outages

If we have an outage in a microservice, how does our application respond to it?

For `notebooks` outage behavior, refer to [DD-2](#dd-2-notes-behavior-on-notebooks-outage).

For `notes` outage behavior:

#### [REJECTED] Stop the whole application

Respond with HTTP `503` on `notes` outage.

**Pros**
- Ensures no data inconsistencies

**Cons**
- Lose out on availability to users
- Tightly couples `notebooks` and `notes` (now `notebooks` is aware of `notes`'s state)

**Rejected** due to losing out on availability to users.

#### [REJECTED] Keep `notebooks` up

**Pros**
- Partial service availability

**Cons**
- On DELETE, we can't cascade delete all associated notes -> data inconsistencies

**Rejected** due to data inconsistencies

#### [ACCEPTED] Keep `notebooks` up in a degraded state

Explicitly reject DELETE requests with an HTTP `503` response.

**Pros**
- Partial service availability
- Avoids data inconsistencies

**Cons**
- Partial service disruption: now client can't delete notebooks

**Accepted**

### DD-6: `Notebook` and `Note` field limits

TODO: separate this as DD-6 and have DD-7 capacity planning.

How much do we limit the string length of `Notebook.name`, `Notebook.description`,
`Note.title`, `Note.content`?

We want to limit the length of these fields, because a bad intentioned user can
easily abuse and overflow our data stores.

Assume [A-4](#a-4-string-field-encoding) and [A-5](#a-5-conservative-string-fields-length).

What follows is capacity planning:

Ids are stored with:

```math
Notebook.id = 7 characters * 1 byte = 7 bytes
```
```math
Note.id = 8 characters * 1 byte = 8 bytes
```

The size of `Notebook` records is:

```math
sizeof(Notebook) = sizeof(Notebook.name) + sizeof(Notebook.id) + sizeof(Notebook.description)
```
```math
sizeof_{90\%}(Notebook) = 50 bytes + 7 bytes + 500 bytes = 557 bytes
```
```math
sizeof_{10\%}(Notebook) = 200 bytes + 7 bytes + 2000 bytes = 2207 bytes
```

For 1 year we store the following amount of data in `notebooks`:

```math
data_{1y} = 90\% * 52 mil. * 557 bytes + 10\% * 52 mil. * 2207 bytes ~= 37 Gb
```

The size of `Note` records is:

```math
sizeof(Note) = sizeof(Note.title) + sizeof(Note.id) + sizeof(Note.content) + sizeof(Notebook.id)
```
```math
sizeof_{90\%}(Note) = 50 bytes + 8 bytes + 5000 bytes + 7 bytes = 5515 bytes
```
```math
sizeof_{10\%}(Note) = 200 bytes + 8 bytes + 20000 bytes + 7 bytes = 22015 bytes
```

For 1 year we store the following amount of data in `notes`:

```math
data_{1y} = 90\% * 3.65 bil. * 5515 bytes + 10\% * 3.65 bil. * 22015 bytes ~= 24 Tb
```
