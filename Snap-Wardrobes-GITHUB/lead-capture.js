/* ============================================================================
   Snap Wardrobes — GoHighLevel lead capture (static-site, no backend)
   ----------------------------------------------------------------------------
   HOW IT WORKS
   - Every contact form on the site is handled by this one file.
   - On submit it collects the fields, maps First Name / Last Name / Email /
     Phone to GoHighLevel's standard contact fields, and puts Suburb plus every
     other answer into a single "notes" block.
   - It POSTs once to your GoHighLevel Inbound Webhook. No API key is exposed,
     nothing is stored, and it works on Cloudflare Pages with zero server code.

   SETUP (one time) — see GHL-SETUP.md for screenshots-level detail:
     1. In GoHighLevel: Automation > Workflows > + Create Workflow > start with
        an "Inbound Webhook" trigger. Copy the webhook URL it gives you.
     2. Paste that URL between the quotes on the GHL_WEBHOOK_URL line below.
     3. In the same workflow add "Create/Update Contact" and map:
          First Name  = {{inboundWebhookRequest.first_name}}
          Last Name   = {{inboundWebhookRequest.last_name}}
          Email       = {{inboundWebhookRequest.email}}
          Phone       = {{inboundWebhookRequest.phone}}
        then add an "Add Note" action = {{inboundWebhookRequest.notes}}
     4. Publish the workflow. Done — every form on the site now feeds GHL.
   ========================================================================== */

(function () {
  // ====== PASTE YOUR GOHIGHLEVEL INBOUND WEBHOOK URL BETWEEN THE QUOTES ======
  var GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/lprvz2OscAxE38YObYZr/webhook-trigger/55ca1a55-9fdb-46e0-896a-ec2c098bf2a0";
  // ==========================================================================

  var MATCH = {
    first: /first|given|fname/i,
    last:  /last|family|surname|lname/i,
    email: /email/i,
    phone: /phone|mobile|tel/i,
    full:  /^name$|full.?name|your.?name/i
  };

  function pretty(s) {
    return s.replace(/[_\-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function collect(form) {
    var std = { first_name: "", last_name: "", email: "", phone: "" };
    var fullName = "", notes = [];
    var els = form.querySelectorAll("input, select, textarea");
    Array.prototype.forEach.call(els, function (el) {
      if (!el.name) return;
      if (el.disabled) return;
      if (el.type === "submit" || el.type === "button" || el.type === "hidden" && /^_hp$/i.test(el.name)) return;
      var v = (el.value || "").trim();
      var n = el.name;
      if (MATCH.first.test(n)) { std.first_name = v; return; }
      if (MATCH.last.test(n))  { std.last_name = v; return; }
      if (MATCH.email.test(n)) { std.email = v; return; }
      if (MATCH.phone.test(n)) { std.phone = v; return; }
      if (MATCH.full.test(n))  { fullName = v; return; }
      if (v) notes.push(pretty(n) + ": " + v);
    });
    // If the form only had a single "Full Name" field, split it into first/last.
    if (!std.first_name && !std.last_name && fullName) {
      var parts = fullName.split(/\s+/);
      std.first_name = parts.shift() || "";
      std.last_name = parts.join(" ");
    }
    return { std: std, fullName: fullName, notes: notes };
  }

  function payloadFor(form) {
    var c = collect(form);
    var fullName = ((c.std.first_name + " " + c.std.last_name).trim()) || c.fullName;
    return {
      first_name: c.std.first_name,
      last_name: c.std.last_name,
      name: fullName,
      email: c.std.email,
      phone: c.std.phone,
      notes: c.notes.join("\n"),
      source: form.getAttribute("data-source") || (document.title || "Website"),
      page: location.pathname
    };
  }

  function showThanks(form) {
    var box = document.createElement("div");
    box.setAttribute("role", "status");
    box.style.cssText = "padding:28px 26px;border:1.5px solid #C9974C;background:#0E1F1A;color:#F4EFE4;" +
      "font-family:Manrope,-apple-system,sans-serif;font-size:16px;line-height:1.6;text-align:center;border-radius:2px";
    box.innerHTML = "<strong style=\"font-family:Archivo,sans-serif;font-size:18px\">Thank you — we’ve got your details.</strong>" +
      "<br>Our team will call shortly to arrange your in-home design consultation.";
    if (form.parentNode) form.parentNode.replaceChild(box, form);
  }

  // Single delegated handler covers every form, including ones injected later
  // (e.g. the homepage multi-step form). Capture phase + stopPropagation also
  // suppresses any old prototype alert() handlers still on the page.
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.hasAttribute("data-noajax")) return;

    e.preventDefault();
    e.stopPropagation();

    // Simple spam trap: if a hidden _hp field exists and is filled, drop silently.
    var hp = form.querySelector('[name="_hp"]');
    if (hp && hp.value) { showThanks(form); return; }

    var payload = payloadFor(form);

    try {
      if (GHL_WEBHOOK_URL && GHL_WEBHOOK_URL.indexOf("PASTE_YOUR") === -1) {
        // Form-encoded = a "simple" request (no CORS pre-flight) AND GoHighLevel
        // parses every field into a mappable reference (first_name, last_name,
        // email, phone, notes, source, page). Do NOT switch this to JSON.
        fetch(GHL_WEBHOOK_URL, {
          method: "POST",
          body: new URLSearchParams(payload),
          mode: "no-cors",
          keepalive: true
        }).catch(function () {});
      } else {
        console.warn("[SnapLead] No webhook set yet — paste your GoHighLevel Inbound Webhook URL into lead-capture.js");
      }
    } catch (err) { /* never block the user */ }

    showThanks(form);
  }, true);
})();
