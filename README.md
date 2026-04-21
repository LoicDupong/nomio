# Travel Memory Map

**Pin your trips. Share the moments. Relive every place.**

Travel Memory Map is a collaborative travel journal built around an interactive map. Drop pins on the places you visited, add notes, photos, and ratings — then share the whole trip with friends in one click, no account needed.

Simple to use. Real-time by design. Built for the people you travel with.

---

## Live Demo

> Coming soon — deployment in progress.

---

## Features

### Plan & Share a Trip

- Create a trip in seconds and get a shareable invite link
- Invite friends to join — no sign-up required (guest mode)
- Authenticated users keep their history across sessions

### Interactive Map

- Drop pins anywhere on the map
- Categorize by type: Food, Spot, Hotel, Activity
- Search pins by name, category, or note content
- Geocoding search to jump to any city or address
- Geolocate yourself directly on the map

### Rich Pin Details

- Title, category, note, budget estimate, and star rating
- Attach photos directly to a pin
- View pins on the map from the gallery — and vice versa

### Photo Gallery

- Upload photos to the trip gallery
- Link photos to specific pins
- Full-screen modal with author, date, and pin context

### Real-Time Collaboration

- All members see new pins, edits, and deletions live
- Toast notifications when a collaborator adds a pin
- Powered by Socket.io — no refresh needed

---

## Screenshots

| Map View | Pin Detail | Gallery |
|----------|------------|---------|
| Interactive map with colored markers per category | Modal with notes, budget, rating, and photo | Grid view with pin linking and full-screen preview |

> Full screenshots coming with the public launch.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 18, SCSS |
| Backend | Node.js, Express |
| Database | PostgreSQL + Sequelize |
| State | Zustand |
| Real-time | Socket.io |
| Map | Leaflet + OpenStreetMap |
| Icons | Font Awesome |

---

## Architecture

The project is split into two independent apps:

- **`/` (frontend)** — Next.js App Router. Client-side state managed via Zustand. API calls via Axios with a global auth interceptor.
- **`/server` (backend)** — Express REST API. JWT auth (user + guest tokens). File uploads via Multer. Socket.io for real-time events.

The frontend and backend communicate over a REST API. Real-time updates are pushed via Socket.io rooms — one room per trip. No polling.

---

## Beta Status

Travel Memory Map is currently in **beta**.

The core features work and have been tested, but you may encounter rough edges — occasional UI hiccups, edge cases in file uploads, or minor inconsistencies. This is a project in active development, not a polished production release.

Use it, break it, and tell me what you find.

---

## Feedback

If something feels off, broken, or could be better — I want to know.

This project is evolving. Every piece of feedback helps shape the next version. Open an issue, send a message, or just reach out directly. There's no wrong way to give feedback on a beta.

---

## Roadmap

Things coming in future versions:

- Map pin clustering for dense trip areas
- Public trip mode (shareable read-only view)
- Trip statistics (pins by category, total distance, etc.)
- Export trip as PDF or image
- Improved mobile experience
- User profile and trip history

---

## Author

Built by **Loïc Dupong** — fullstack JavaScript developer (Belgium).

Travel Memory Map is a portfolio project built to demonstrate real-world fullstack development: collaborative features, real-time sync, file handling, and a clean product-focused UI. Built with the same stack I use for production work: Next.js, Express, PostgreSQL, and Zustand.
