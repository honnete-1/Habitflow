# HabitFlow — Personal Habit Tracker

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat&logo=nginx&logoColor=white)
![HAProxy](https://img.shields.io/badge/HAProxy-Load%20Balancer-blue?style=flat)

HabitFlow is a personal habit tracking web app that helps users build good habits and break bad ones, with real API integrations that provide genuine value. Track nutrition, monitor sobriety time, calculate savings, and convert them to another currency, all from a clean and intuitive dashboard.

**Live Demo:** [https://habitflow.honnete.tech](https://habitflow.honnete.tech) &nbsp;|&nbsp; **Video Demo:** [Watch on Loom](https://www.loom.com/share/2373663a3247409a8673a6dd43897e8c)

---

## Table of Contents

- [Features](#features)
- [APIs Used](#apis-used)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [API Key Setup](#api-key-setup)
- [Deployment](#deployment)
- [Load Balancer Configuration](#load-balancer-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Verifying Load Balancing](#verifying-load-balancing)
- [Security](#security)
- [Challenges and Solutions](#challenges-and-solutions)
- [Bonus Features](#bonus-features)
- [Credits](#credits)

---

## Features

### Home Dashboard
- **Habit Balance Score** — live progress bar showing good habits completed today vs total scheduled
- **Total Money Saved** — real-time accumulation of savings from kicked bad habits
- **Current Best Streak** — highest consecutive-day streak across all good habits
- **Active Sobriety Timers** — live overview of all bad habit clocks ticking on the home page

### Embrace — Good Habits

| Feature | Description |
|---|---|
| 10 Categories | Health, Sports, Finance, Personal Development, Mental Wellness, Social, Productivity, Nutrition, Sleep, Creativity |
| Frequency Selector | Choose which days of the week the habit applies |
| Icon Picker | 32 icons representing different habit types |
| Daily Checklist | Tick off habits each day to build streaks |
| Streak Counter | Tracks consecutive days of completion |
| USDA Nutrition Verify | Look up real calorie, protein, and carb data for food habits |

### Kick — Bad Habits

| Feature | Description |
|---|---|
| Live Sobriety Clock | Ticks Days, Hours, Minutes, Seconds since last relapse |
| Savings Ticker | Calculates money saved based on weekly cost — updates every second |
| Currency Conversion | Converts savings to a second currency using live ECB exchange rates |
| Optional Cost | Habits with no financial cost (laziness, procrastination) show only the clock |
| Trigger Reflection | Reset requires a written reflection log before the clock resets |

### Error Handling
- `try/catch` on all API calls
- Toast notifications for API failures with "Data Unavailable" message
- Loading skeleton shown while API is fetching
- Input validation with descriptive feedback on every form field
- XSS protection — all user input sanitised before DOM injection

---

## APIs Used

| API | Purpose | Auth | Free Tier | Docs |
|---|---|---|---|---|
| USDA FoodData Central | Real nutrition data (calories, protein, carbs) for food habits | API key required | 1,000 req/hour | [Docs](https://fdc.nal.usda.gov/fdc-app.html) |
| Frankfurter (ECB) | Live currency exchange rates for savings conversion | No key needed | Unlimited | [Docs](https://www.frankfurter.app/docs/) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Storage | Browser localStorage (no backend needed) |
| Icons | FontAwesome 6 Free (CDN) |
| Fonts | Plus Jakarta Sans + DM Sans (Google Fonts) |
| Web Server | Nginx (Web01 + Web02) |
| Load Balancer | HAProxy (Lb01) |
| SSL | Let's Encrypt via Certbot |

---

## Project Structure

```
Habitflow/
├── index.html      main HTML — all three page views (Home, Embrace, Kick)
├── style.css       full design system (colors, layout, animations, responsive)
├── script.js       all app logic (APIs, state management, rendering, localStorage)
├── config.js       API keys and base URLs — excluded from GitHub via .gitignore
├── .gitignore      prevents config.js from being pushed to GitHub
└── README.md       this file
```

---

## Local Setup

No installation, no build tools, no server required.

**1. Clone the repository**
```bash
git clone https://github.com/honnete-1/Habitflow.git
cd Habitflow
```

**2. Add your USDA API key** (see [API Key Setup](#api-key-setup) below)

**3. Open the app**
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

Open `index.html` directly in Chrome, Firefox, or Edge — no localhost server needed.

---

## API Key Setup

**USDA FoodData Central** — required for nutrition verification:

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill in the short form — takes about one minute
3. Key arrives by email instantly
4. Open `config.js` and replace `"DEMO_KEY"`:

```js
const APP_CONFIG = {
  USDA_API_KEY: "your_real_key_here",
  USDA_BASE_URL: "https://api.nal.usda.gov/fdc/v1/foods/search",
  FRANKFURTER_BASE_URL: "https://api.frankfurter.app/latest",
};
```

> `DEMO_KEY` works but is rate-limited to 30 requests/hour. A personal key gives 1,000/hour.

**Frankfurter API** — no key needed. Completely free and open.

> Never commit `config.js` to GitHub. It is listed in `.gitignore` to keep your API key private.

---

## Deployment

The app is deployed on two Ubuntu web servers behind an HAProxy load balancer.

### Architecture

```
                        Users
                          |
                          v
              +-----------+-----------+
              |      Lb01 — HAProxy   |
              |      52.201.216.204   |
              |  habitflow.honnete    |
              |       .tech           |
              |   SSL Termination     |
              +-----------+-----------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
  +---------------------+   +---------------------+
  |   Web01 — Nginx     |   |   Web02 — Nginx     |
  |   44.211.76.97      |   |   13.218.144.213    |
  |  /var/www/Habitflow |   |  /var/www/Habitflow |
  +---------------------+   +---------------------+
```

### Live Servers

| Server | IP | URL |
|---|---|---|
| Web01 | 44.211.76.97 | http://44.211.76.97 |
| Web02 | 13.218.144.213 | http://13.218.144.213 |
| Load Balancer | 52.201.216.204 | https://habitflow.honnete.tech |

### Deploying to Web01 and Web02

The same steps were followed on both servers.

**SSH into the server**
```bash
ssh -i ~/.ssh/id_rsa ubuntu@44.211.76.97   # Web01
ssh -i ~/.ssh/id_rsa ubuntu@13.218.144.213  # Web02
```

**Install Nginx and Git**
```bash
sudo apt update
sudo apt install -y nginx git
```

**Clone the repository**
```bash
cd /var/www
sudo git clone https://github.com/honnete-1/Habitflow.git
```

**Create config.js manually on the server**

Since `config.js` is excluded from GitHub for security, create it manually:
```bash
sudo nano /var/www/Habitflow/config.js
```

Paste the full config with your real USDA API key and save.

**Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/habitflow
```

Paste this (use `"Web02"` on the second server):
```nginx
server {
    listen 80;
    server_name 44.211.76.97;

    root /var/www/Habitflow;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
        add_header X-Served-By "Web01" always;
    }
}
```

**Enable the site and remove the default**
```bash
sudo ln -s /etc/nginx/sites-available/habitflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Load Balancer Configuration

HAProxy was used on Lb01 for load balancing and SSL termination.

**SSH into Lb01**
```bash
ssh -i ~/.ssh/id_rsa ubuntu@52.201.216.204
```

**Edit HAProxy config**
```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Configuration used:
```
frontend www-http
    bind *:80
    http-request redirect scheme https code 301

frontend www-https
    bind *:443 ssl crt /etc/haproxy/certs/habitflow.honnete.tech.pem
    default_backend web-backend

backend web-backend
    balance roundrobin
    option httpchk HEAD / HTTP/1.1\r\nHost:\ localhost
    server web-01 44.211.76.97:80 check
    server web-02 13.218.144.213:80 check
```

**Restart HAProxy**
```bash
sudo systemctl restart haproxy
sudo systemctl status haproxy
```

### How traffic flows

```
HTTP :80
    |
    v
301 Redirect
    |
    v
HTTPS :443 (SSL Termination)
    |
    v
Roundrobin Algorithm
    |          |
    v          v
  Web01      Web02
```

- All HTTP traffic on port 80 is automatically redirected to HTTPS
- HAProxy handles SSL termination at port 443
- Requests are distributed between Web01 and Web02 using **roundrobin**
- Each server has a custom `X-Served-By` response header for traffic verification

---

## SSL Certificate Setup

Free trusted SSL certificate from Let's Encrypt via Certbot.

**Install Certbot on Lb01**
```bash
sudo apt update
sudo apt install -y certbot
```

**Stop HAProxy temporarily so Certbot can use port 80**
```bash
sudo systemctl stop haproxy
```

**Get the certificate**
```bash
sudo certbot certonly --standalone -d habitflow.honnete.tech
```

**Combine certificate and private key into one PEM file for HAProxy**
```bash
sudo cat /etc/letsencrypt/live/habitflow.honnete.tech/fullchain.pem \
     /etc/letsencrypt/live/habitflow.honnete.tech/privkey.pem \
     | sudo tee /etc/haproxy/certs/habitflow.honnete.tech.pem > /dev/null

sudo chmod 600 /etc/haproxy/certs/habitflow.honnete.tech.pem
```

**Restart HAProxy**
```bash
sudo systemctl start haproxy
```

Visit `https://habitflow.honnete.tech` — valid SSL, green padlock, no browser warnings.

---

## Verifying Load Balancing

Run this command multiple times and watch the `X-Served-By` header alternate between servers:

```bash
curl -k -I https://habitflow.honnete.tech
```

Expected output:
```
HTTP/2 200
x-served-by: Web01
```
Run again:
```
HTTP/2 200
x-served-by: Web02
```

This confirms roundrobin is distributing traffic evenly between Web01 and Web02.

---

## Security

| Measure | Implementation |
|---|---|
| API key protection | Stored in `config.js`, excluded from GitHub via `.gitignore` |
| XSS prevention | All user input passed through `escHtml()` before `innerHTML` injection |
| Input validation | All forms validated with descriptive toast feedback before submission |
| API error handling | Both APIs wrapped in `try/catch` with graceful degradation on failure |
| Rate caching | Exchange rates cached for 30 minutes to reduce unnecessary API calls |
| Submit lock | `isAddingKick` flag disables button during async API call to prevent duplicates |

---

## Challenges and Solutions

| Challenge | Solution |
|---|---|
| Sobriety clock performance with multiple habits | Replaced individual `setInterval` per habit with one shared interval looping through all habits |
| `toISOString()` returning UTC instead of local time | Subtracted `getTimezoneOffset()` to get correct local time for the datetime input |
| Habits with no cost showing `$0.00` savings | Made weekly cost optional — savings row only renders when cost is greater than zero |
| Frankfurter API returning 404 for RWF | Removed RWF — Frankfurter only supports ECB-tracked currencies |
| Port 80 already in use on Lb01 | Used existing HAProxy directly for load balancing instead — better suited for the task |
| USDA API returning 403 with DEMO_KEY | Registered a personal key — DEMO_KEY is shared and rate-limited |
| Duplicate habits on double-click during API call | Added `isAddingKick` submit lock that disables the button during the async request |
| Savings showing `$0.00` within the first 24 hours | Changed `calcSavings` to use raw milliseconds instead of whole integer days |
| USDA API key had a leading space causing 403 | Traced via debug `console.log` in the Network tab — removed the accidental space |

---

## Bonus Features

- Exchange rates cached for 30 minutes — Frankfurter API not called on every clock tick
- Loading skeleton animation shown while waiting for USDA API response
- Mobile responsive layout with hamburger menu for sidebar navigation
- Daily reset — habit checkboxes reset automatically each new day
- Reflection log saved to localStorage whenever a sobriety timer is reset
- HTTPS with SSL termination on the load balancer
- HTTP to HTTPS automatic redirect (301)
- Custom domain with valid Let's Encrypt certificate

---

## Credits

**APIs**
- USDA FoodData Central — https://fdc.nal.usda.gov
- Frankfurter open exchange rates (ECB) — https://www.frankfurter.app

**Libraries and Tools**
- FontAwesome 6 Free — https://fontawesome.com
- Plus Jakarta Sans — https://fonts.google.com/specimen/Plus+Jakarta+Sans
- DM Sans — https://fonts.google.com/specimen/DM+Sans
- Nginx — https://nginx.org
- HAProxy — https://www.haproxy.org
- Let's Encrypt — https://letsencrypt.org

---

## Developer

**Name:** Honnete Nishimwe &nbsp;**Email:** [h.nishimwe@alustudent.com](mailto:h.nishimwe@alustudent.com) &nbsp;**GitHub:** [github.com/honnete-1](https://github.com/honnete-1)

**Course:** Web Infrastructure
**Assignment:** Playing with APIs
**Date:** March 2026