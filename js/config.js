/* =====================================================================
   PINK WORLD — STORE CONFIGURATION
   ===================================================================== */

const STORE_CONFIG = {
  name: "Pink World",
  tagline: "Fashion & Everyday Essentials for the Whole Family",
  description: "Trendy sarees, kurtis, western wear, men's collections & intimate wear — now online from our Erattayar and Nedumkandam stores.",

  whatsapp: "917306775643",

  email: "info@pinkworldstore.in",

  freeShippingThreshold: 1499,
  currency: "₹",

  razorpayEnabled: true,
  razorpayKeyId: "rzp_test_TeezvvjQSJNKGD",

  // This exact number (with +country code, no spaces) is the ONLY
  // login that can make changes on admin.html — both the Firestore
  // security rules AND the admin page itself check against this.
  adminPhone: "+910000000000",

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
