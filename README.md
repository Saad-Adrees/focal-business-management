# Focal Business Management System

A GitHub-ready full-stack starter for managing clients, projects, tasks, and invoices.

## Stack

- Laravel 12 API + Laravel Sanctum
- MySQL (XAMPP / phpMyAdmin)
- React + TypeScript + Vite
- Tailwind CSS packages are installed for extension

## Setup

1. Start Apache and MySQL in XAMPP. Create a database named `focal_business` in phpMyAdmin.
2. In `backend/.env`, set `DB_DATABASE=focal_business`, `DB_USERNAME=root`, and an empty `DB_PASSWORD` unless your XAMPP MySQL uses a password.
3. Run `cd backend`, `php artisan migrate --seed`, and `php artisan serve`.
4. In another terminal run `cd frontend`, `npm run dev`.
5. Open the Vite URL shown in the terminal. The frontend proxies `/api` to Laravel at `127.0.0.1:8000`.

The initial frontend login is a lightweight workspace entry screen. Connect its submit handler to `/api/login` for real credentials; the backend accepts `email`, `password`, and registration with `password_confirmation`.

## API

`POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/user`, and `GET /api/dashboard` are available. Protected CRUD resources are `/api/clients`, `/api/projects`, `/api/tasks`, and `/api/invoices`. Send `Authorization: Bearer {token}` to protected routes.

Import `docs/focal.postman_collection.json` into Postman and set its `base_url` variable to `http://127.0.0.1:8000/api`.

## GitHub

Commit `backend`, `frontend`, `docs`, and this README. Never commit `.env`, tokens, or database files. Each app contains its own lockfile and can be deployed independently.
