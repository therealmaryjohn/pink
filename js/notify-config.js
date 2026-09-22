/* =====================================================================
   PINK WORLD — EMAIL NOTIFICATIONS CONFIGURATION (EmailJS)
   -----------------------------------------------------------------
   Lets your store email YOU automatically whenever a customer places
   an order or submits the Contact Us form. Runs in the browser using
   EmailJS (free tier: 200 emails/month) — no backend server needed.

   HOW TO SET THIS UP:
   1. Go to https://www.emailjs.com and create a free account.
   2. Add an "Email Service" (e.g. connect your Gmail) — this becomes
      your EMAILJS_SERVICE_ID.
   3. Create TWO email templates under "Email Templates":
        a) An "Order" template using: {{customer_name}}, {{customer_phone}},
           {{customer_address}}, {{branch}}, {{items_text}}, {{total}},
           {{payment_method}}
        b) A "Contact" template using: {{customer_name}}, {{customer_phone}},
           {{message}}
   4. Go to Account > General to find your Public Key.
   5. Paste all the values below, set NOTIFY_EMAIL_TO, then set
      EMAILJS_ENABLED to true.
   ===================================================================== */

const EMAILJS_ENABLED = false;

const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_ORDER_TEMPLATE_ID = "YOUR_ORDER_TEMPLATE_ID";
const EMAILJS_CONTACT_TEMPLATE_ID = "YOUR_CONTACT_TEMPLATE_ID";

const NOTIFY_EMAIL_TO = "info@pinkworldstore.in";
