# Cashless-Bus-fare
A system to automate booking of busses and matatu.# Matatu & Bus Online Booking System

A lightweight web app for booking local buses and matatus in Kenya, featuring Paystack M-Pesa payments and Brevo email ticketing.

## Features

- **Customer Booking**: View routes and book tickets without logging in.
- **M-Pesa STK Push**: Instant payment processing powered by Paystack.
- **Email Receipts**: Automatic ticket delivery via Brevo API.
- **Driver Portal**: Drivers log in via PIN to post new routes and manage profile details.
- **Admin Panel**: Register vehicles/drivers, delete routes, and track customer bookings.
- **Mobile Friendly**: Minimalist white-and-green responsive layout.

## File Overview

- `index.html` / `script.js` – Customer portal & booking payment logic
- `driver.html` / `driver.js` – Driver portal for posting routes
- `admin.html` / `admin.js` – Admin dashboard for system management
- `styles.css` / `admin.css` – App layout and responsive styling
- `keys.txt` – Supabase, Paystack, and Brevo API key reference

## How to Run

1. Run the SQL schema in your **Supabase** SQL Editor to set up tables (`matatus`, `routes`, `bookings`).
2. Add your **Paystack** public key in `script.js`.
3. Open `index.html` in your browser.
