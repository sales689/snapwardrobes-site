# Connecting the website forms to GoHighLevel (Cloudflare-hosted)

This is the simplest possible setup for a static site on Cloudflare Pages: no
backend, no API key, no plugins. Every form on the site posts to one GoHighLevel
**Inbound Webhook**, and a one-time workflow turns that into a contact.

Total time: about 10 minutes, once.

## What gets sent
| Website field | Goes to GoHighLevel |
|---|---|
| First Name | Contact **First Name** (mandatory) |
| Last Name | Contact **Last Name** (mandatory) |
| Email | Contact **Email** (mandatory) |
| Phone | Contact **Phone** (mandatory) |
| Suburb + everything else (service, budget, timing, rooms, kitchen scope, message, etc.) | A single **Note** on the contact |

(On the shorter forms that have one "Full Name" box, the name is split into
first + last automatically before it's sent.)

## Step 1 — Create the webhook in GoHighLevel
1. Go to **Automation → Workflows → + Create Workflow → Start from scratch**.
2. Click **Add New Trigger → Inbound Webhook**.
3. It shows a **Webhook URL**. Copy it.

## Step 2 — Paste the URL into the site
1. Open **lead-capture.js** (it's in this folder).
2. Find this line near the top:
   ```
   var GHL_WEBHOOK_URL = "PASTE_YOUR_GOHIGHLEVEL_WEBHOOK_URL_HERE";
   ```
3. Replace the placeholder with your webhook URL, keeping the quotes:
   ```
   var GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/....";
   ```
4. Save.

> Tip: submit any form on the site once (with the URL pasted in) so GoHighLevel
> captures a **sample request**. That makes the field names appear in the
> mapping dropdowns in the next step.

## Step 3 — Map the fields
In the same workflow, after the trigger:
1. **Add Action → Create/Update Contact.** Map:
   - First Name → `{{inboundWebhookRequest.first_name}}`
   - Last Name → `{{inboundWebhookRequest.last_name}}`
   - Email → `{{inboundWebhookRequest.email}}`
   - Phone → `{{inboundWebhookRequest.phone}}`
2. **Add Action → Add Note** → `{{inboundWebhookRequest.notes}}`
3. (Optional) Add a **Send Internal Notification** action to email/SMS yourself
   on every new lead, and a tag like `website-lead`.
4. Click **Publish** (top right) and toggle the workflow **On**.

## Step 4 — Deploy to Cloudflare
1. In Cloudflare Pages, drag-and-drop this whole folder (or connect the repo).
2. Cloudflare serves `index.html` as the home page automatically.
3. Test: open the live site, submit a form, and check the contact appears in
   GoHighLevel with the note attached.

## Notes
- **Data usage** is tiny — each submission is a single small POST (well under 1 KB).
- **Spam:** the handler supports an optional hidden `_hp` honeypot field; add
  `<input type="text" name="_hp" style="display:none" tabindex="-1" autocomplete="off">`
  to a form and bots that fill it are dropped silently.
- The forms show a "Thank you" message after submit. Because the request is
  fire-and-forget (best for a no-backend setup), it always shows success even if
  GHL is briefly unreachable — the POST still reaches GoHighLevel.
- If you later want a guaranteed delivery receipt or server-side validation, the
  alternative is a small Cloudflare Pages Function proxying to the GHL API with a
  token stored as a Cloudflare secret. More robust, slightly more setup. Ask and
  I'll build it.
