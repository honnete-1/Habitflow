# HabitFlow

A habit tracking web app I built for my assignment. The idea came from wanting something that actually helps you stay on track with personal goals rather than just being another random API demo.

The app has two main sections:
- **Embrace** — for building good habits (reading, gym, meditation etc)
- **Kick** — for breaking bad habits and tracking how long you've been clean

---

## What it does

On the home page you get a dashboard showing your overall habit balance score, how much money you've saved by quitting bad habits, and your best streak. There's also a live sobriety timer section showing all your bad habits with clocks that tick every second.

The **Embrace** page lets you add good habits with a category, frequency (which days of the week), and an icon. If you're tracking a food-related habit you can also verify its nutrition info using the USDA API — it pulls real calorie and protein data.

The **Kick** page is for bad habits. Every habit gets a live timer showing how long you've been sober. If the habit has a financial cost (like smoking or takeaways) it also shows you how much money you've saved, and converts it to another currency using the Frankfurter API. For habits like laziness or procrastination you can just leave the cost blank and it only shows the clock.

If you relapse and reset the timer, the app forces you to write a short reflection first — what triggered it and how you feel. I thought this was a nice touch based on stuff I read about habit formation.

All data is saved to localStorage so nothing gets lost when you close the browser, and nothing is sent to any server.

---

## Live Deployment

| Server | URL |
|---|---|
| Web01 | http://44.211.76.97 |
| Web02 | http://13.218.144.213 |
| Load Balancer | https://52.201.216.204 |

---

## How to run it locally

Just download the files and open `index.html` in your browser. No installs needed.

```bash
git clone https://github.com/honnete-1/Habitflow.git
cd Habitflow
```

Then open `index.html` directly in Chrome, Firefox, or Edge.

The only setup needed is the USDA API key (see below).

---

## API key setup

**USDA FoodData Central** (for nutrition lookup):

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill in the form — takes about a minute
3. They email you a key straight away
4. Open `config.js` and replace `"DEMO_KEY"` with your key:

```js
USDA_API_KEY: "your_key_here",
```

The `DEMO_KEY` placeholder does work but it's rate limited to 30 requests per hour so it might stop working if you test a lot.

**Frankfurter API** (for currency conversion) — no key needed, it's completely free and open.

---

## Project files

```
Habitflow/
├── index.html     the main HTML structure
├── style.css      all the styling
├── script.js      all the JavaScript logic
├── config.js      API keys - NOT pushed to GitHub
├── .gitignore     makes sure config.js stays off GitHub
└── README.md      this file
```

---

## APIs used

**USDA FoodData Central**
- What it does: returns real nutrition data (calories, protein, carbs) for any food
- Endpoint: `https://api.nal.usda.gov/fdc/v1/foods/search`
- Docs: https://fdc.nal.usda.gov/fdc-app.html
- Needs a key: yes, free from https://fdc.nal.usda.gov/api-key-signup.html

**Frankfurter (European Central Bank rates)**
- What it does: converts currency amounts using live ECB exchange rates
- Endpoint: `https://api.frankfurter.app/latest`
- Docs: https://www.frankfurter.app/docs/
- Needs a key: no, completely free

---

## Deployment (Part 2)

The app is deployed on two web servers behind a load balancer. Here's how I set it up.

### Infrastructure

```
Users
  │
  ▼
Lb01 (HAProxy Load Balancer)
52.201.216.204
  │
  ├── Web01 (Nginx) — 44.211.76.97
  └── Web02 (Nginx) — 13.218.144.213
```

### Deploying to Web01 and Web02

I did the same steps on both servers:

**1. SSH into the server**
```bash
ssh -i ~/.ssh/id_rsa ubuntu@44.211.76.97  # Web01
ssh -i ~/.ssh/id_rsa ubuntu@13.218.144.213  # Web02
```

**2. Install Nginx and Git**
```bash
sudo apt update
sudo apt install -y nginx git
```

**3. Clone the repository**
```bash
cd /var/www
sudo git clone https://github.com/honnete-1/Habitflow.git
```

**4. Create config.js with the API key**

Since config.js is excluded from GitHub for security, I created it manually on each server:
```bash
sudo nano /var/www/Habitflow/config.js
```

Pasted the config with the real USDA API key and saved.

**5. Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/habitflow
```

Pasted this config (changed server_name for each server):
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

**6. Enable the site and remove the default**
```bash
sudo ln -s /etc/nginx/sites-available/habitflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Configuring the Load Balancer (Lb01)

The load balancer uses HAProxy which was already installed on Lb01.

**SSH into Lb01**
```bash
ssh -i ~/.ssh/id_rsa ubuntu@52.201.216.204
```

**Edit HAProxy config**
```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Added this configuration:
```
frontend www-http
    bind *:80
    http-request redirect scheme https code 301

frontend www-https
    bind *:443 ssl crt /etc/haproxy/certs/www.honnete.tech.pem
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
```

### How the load balancer works

- All HTTP traffic on port 80 is automatically redirected to HTTPS
- HAProxy listens on port 443 and handles SSL termination
- Requests are distributed between Web01 and Web02 using the **roundrobin** algorithm — meaning each request goes to the next server in turn
- Both servers have a custom `X-Served-By` header so you can verify which server handled a request

### Verifying load balancing works

Run this multiple times and watch the `X-Served-By` header alternate:
```bash
curl -k -I https://52.201.216.204
```

You should see it switching between `Web01` and `Web02` confirming traffic is being distributed evenly.

---

## Security

The USDA API key is stored in `config.js` which is excluded from the repo via `.gitignore`. The Frankfurter API doesn't need a key so there's nothing to hide there.

User input is sanitised before being inserted into the DOM to prevent XSS issues.

---

## Challenges I ran into

The sobriety clock was trickier than expected. I initially had a separate `setInterval` for each habit card which caused performance issues when there were multiple habits. Fixed it by using one shared interval that loops through all habits at once.

The timezone offset for the datetime input was also annoying — JavaScript's `toISOString()` always returns UTC so I had to subtract `getTimezoneOffset()` to get the correct local time in the input field.

I also had to think carefully about habits that have no cost (like procrastination). Originally the savings row showed $0.00 for these which looked weird, so I made the cost optional and only show the savings section when there's an actual cost entered.

During deployment I found that the Frankfurter currency API doesn't support RWF (Rwandan Franc) so I removed it from the currency options to prevent 404 errors. Users can still enter costs in USD or EUR which are globally recognised.

Port 80 was already in use on Lb01 by HAProxy from a previous school lab exercise. Instead of fighting it I used HAProxy directly for load balancing which actually worked out better since HAProxy is purpose-built for this.

---

## Bonus features

- Exchange rates are cached for 30 minutes so the Frankfurter API isn't called on every clock tick
- Loading skeleton shown while waiting for USDA API response
- Error handling on both APIs with toast notifications if something goes wrong
- Daily reset — habit checkboxes reset each new day automatically
- Reflection log saved whenever a sobriety timer is reset
- HTTPS with SSL termination on the load balancer
- HTTP to HTTPS automatic redirect

---

## Credits

- USDA FoodData Central API — https://fdc.nal.usda.gov
- Frankfurter open exchange rates API — https://www.frankfurter.app
- FontAwesome icons — https://fontawesome.com
- Plus Jakarta Sans & DM Sans fonts — Google Fonts

---

## Author

**[Your Name]**
Student ID: [Your ID]
[Your Course / Module Name]

