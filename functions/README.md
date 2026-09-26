# Pink World — Secure Payment Verification Setup

This folder fixes the "shows Payment Successful even when it failed" bug by
verifying every payment with Razorpay's own servers using your **Key Secret**
— which stays safely here, never in your website files.

**Note:** this version uses Firebase's current **Secret Manager** system
(the old `functions.config()` command is being retired by Firebase, so we
use the newer, more secure replacement instead).

---

## Step 1 (already done): Install Node.js, firebase-tools, and log in
If you've already run `node --version`, `firebase --version`, and
`firebase login` successfully — you can skip to Step 2.

## Step 2 (already done): `firebase init functions`
If this already completed in your project folder, skip to Step 3.

## Step 3: Update the SDK version (one-time)

In your Command Prompt/Terminal, still inside your `pinkworld` folder, run:

```
cd functions
npm install firebase-functions@latest firebase-admin@latest
cd ..
```

This ensures you have the version that supports Secret Manager.

## Step 4: Store your Razorpay Key Secret securely (Secret Manager)

Run these two commands one at a time. For each one, it will ask you to
**paste the secret value**, then press Enter:

```
firebase functions:secrets:set RAZORPAY_KEY_ID
```
When prompted, paste: `rzp_live_TfR9OdqRcAtrA2` and press Enter.

```
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```
When prompted, paste your **real Razorpay Key Secret** (from your Razorpay
Dashboard → API Keys) and press Enter.

Each command will ask **"Create a new secret version?"** — type `y` and
press Enter.

These values are now stored encrypted in Google Cloud Secret Manager — they
will never appear in any file, any repo, or any browser.

## Step 5: Deploy

```
firebase deploy --only functions
```

The first time you deploy functions with secrets, it may ask to enable a
couple of Google Cloud APIs (Cloud Build, Artifact Registry, Secret Manager)
— type `y` / press Enter to approve each one. This can take 2–5 minutes the
first time.

When it finishes, look for output like this:

```
✔  functions[createRazorpayOrder(us-central1)] Successful create operation.
Function URL (createRazorpayOrder): https://us-central1-pink-world-store.cloudfunctions.net/createRazorpayOrder

✔  functions[verifyRazorpayPayment(us-central1)] Successful create operation.
Function URL (verifyRazorpayPayment): https://us-central1-pink-world-store.cloudfunctions.net/verifyRazorpayPayment
```

**Copy the base part of that URL** (everything before `/createRazorpayOrder`),
for example:
```
https://us-central1-pink-world-store.cloudfunctions.net
```

## Step 6: Turn it on in your website

1. Open `js/payment-verify-config.js` in your website files.
2. Paste that URL in as `CLOUD_FUNCTIONS_BASE_URL`.
3. Change `PAYMENT_VERIFICATION_ENABLED` to `true`.
4. Upload the updated `js/payment-verify-config.js` file to your live site
   (GitHub or Hostinger, wherever your site is hosted), replacing the old one.

That's it! From now on, every online payment is independently confirmed with
Razorpay's own servers before your site ever shows "Payment Successful" —
closing the exact bug you reported.

---

## If you get stuck
Copy the exact error message from your Command Prompt/Terminal and share it —
this works the same way as the DNS/Firebase troubleshooting we've already
done together.
