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

If you relapse and reset the timer, the app forces you to write a short reflection first, what triggered it and how you feel. I thought this was a nice touch based on stuff I read about habit formation.

All data is saved to localStorage so nothing gets lost when you close the browser, and nothing is sent to any server.

---

## How to run it locally

Just download the files and open `index.html` in your browser. No installs needed.

```bash
git clone https://github.com/YOUR_USERNAME/habitflow.git
cd habitflow
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
habitflow/
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

## Security

The USDA API key is stored in `config.js` which is excluded from the repo via `.gitignore`. The Frankfurter API doesn't need a key so there's nothing to hide there.

User input is sanitised before being inserted into the DOM to prevent XSS issues.

---

## Challenges I ran into

The sobriety clock was trickier than expected. I initially had a separate `setInterval` for each habit card which caused performance issues when there were multiple habits. Fixed it by using one shared interval that loops through all habits at once.

The timezone offset for the datetime input was also annoying,JavaScript's `toISOString()` always returns UTC so I had to subtract `getTimezoneOffset()` to get the correct local time in the input field.

I also had to think carefully about habits that have no cost (like procrastination). Originally the savings row showed $0.00 for these which looked weird, so I made the cost optional and only show the savings section when there's an actual cost entered.

---

## Bonus features

- Exchange rates are cached for 30 minutes so the Frankfurter API isn't called on every clock tick
- Loading skeleton shown while waiting for USDA API response
- Error handling on both APIs with toast notifications if something goes wrong
- Daily reset — habit checkboxes reset each new day automatically
- Reflection log saved whenever a sobriety timer is reset

---

## Credits

- USDA FoodData Central API — https://fdc.nal.usda.gov
- Frankfurter open exchange rates API — https://www.frankfurter.app
- FontAwesome icons — https://fontawesome.com
- Plus Jakarta Sans & DM Sans fonts — Google Fonts

---

## Author

**[Honnete Nishimwe]**
Student EMAIL: [h.nishimwe@alustudent.com]
[Software Engineering / Web Infrastructure]
