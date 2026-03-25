/**
 *  config.js — API Key Configuration
 * *  
 *
 *  HOW TO GET A FREE USDA FOODDATA CENTRAL API KEY:
 *  Visit: https://fdc.nal.usda.gov/api-key-signup.html
 *  Fill in the short form → key arrives by email in seconds.
 *  Replace the placeholder string below with your real key.
 *
 *  FRANKFURTER API (Currency):
 *  
 *  No key required. The free endpoint is used directly:
 *  https://api.frankfurter.app/latest
 * 
 */

const APP_CONFIG = {
  /**
   * USDA FoodData Central API key.
   * i Used it in script.js → verifyNutrition() to look up real
   * calorie / protein data for an Embrace habit food item.
   *
   */
  USDA_API_KEY: " lFx4DsvwwfSQMXliMzR3r9BQcOgHZlaNuQSFvAkZ ",

  /**
   * Base URL for USDA FoodData Central search endpoint.
   * Docs: https://fdc.nal.usda.gov/fdc-app.html#/?query=
   */
  USDA_BASE_URL: "https://api.nal.usda.gov/fdc/v1/foods/search",

  /**
   * Base URL for Frankfurter open-source currency API.
   * No API key needed. Returns live ECB exchange rates.
   * Docs: https://www.frankfurter.app/docs/
   */
  FRANKFURTER_BASE_URL: "https://api.frankfurter.app/latest",

  /**
   * Default currency conversion pair shown in the
   * Kick (Bad Habits) savings widget.
   * from → to: user's savings currency → comparison currency.
   */
  CURRENCY_FROM: "USD",
  CURRENCY_TO: "EUR",
};
