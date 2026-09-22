/* =====================================================================
   PINK WORLD — STORE CONFIGURATION
   ===================================================================== */

const STORE_CONFIG = {
  name: "Pink World",
  tagline: "Fashion & Everyday Essentials for the Whole Family",
  description: "Trendy sarees, kurtis, western wear, men's collections & intimate wear — now online from our Erattayar and Nedumkandam stores.",

  whatsapp: "917306775643", // <-- REPLACE with the shop's real WhatsApp number if different

  email: "info@pinkworldstore.in",

  freeShippingThreshold: 1499,
  currency: "₹",

  // ---------------- ONLINE PAYMENTS (Razorpay) ----------------
  // Only the Key ID ever goes here — NEVER put your Key Secret in this
  // file or anywhere in the website. The Key Secret stays private and
  // is only used later if you build a server-side backend.
  razorpayEnabled: true,
  razorpayKeyId: "rzp_test_TeezvvjQSJNKGD", // Test key — safe to use for now while testing

  // ---------------- CUSTOMER ACCOUNTS & ORDERS (Firebase) ----------------
  // adminPhone: the shop owner's own mobile number (used to log in via account.html).
  // This same number unlocks the Store Manager's Orders, Messages tabs, and (if
  // enabled) live Products/Categories editing.
  adminPhone: "+910000000000", // <-- REPLACE with the owner's mobile number

  // Branch / store locations
  branches: [
    {
      name: "Erattayar Branch",
      address: "Erattayar, Idukki District, Kerala - 685514",
      phone: "+91 87142 06294 / +91 73067 75643",
      hours: "Mon – Sat: 9:00 AM – 8:30 PM | Sun: 10:00 AM – 8:00 PM",
      mapEmbed: "https://www.google.com/maps?q=Erattayar,+Idukki,+Kerala&output=embed",
      mapLink: "https://maps.google.com/?q=Erattayar,+Idukki,+Kerala"
    },
    {
      name: "Nedumkandam Branch",
      address: "Nedumkandam, Kerala - 685553",
      phone: "062357 75643",
      hours: "Mon – Sat: 9:00 AM – 8:30 PM | Sun: 10:00 AM – 8:00 PM",
      mapEmbed: "https://www.google.com/maps?q=Nedumkandam,+Idukki,+Kerala&output=embed",
      mapLink: "https://maps.google.com/?q=Nedumkandam,+Idukki,+Kerala"
    }
  ],

  social: {
    instagram: "#",
    facebook: "#",
    youtube: "#"
  }
};
