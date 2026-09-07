// Base44 Payments checkout starter — base44/functions/create-checkout/entry.ts
//
// Provided by the platform. Do NOT rewrite the plumbing (session construct + persisting the
// join key + return-URL resolution). Edit only the region marked `// ===== APP-SPECIFIC =====`
// to resolve — SERVER-SIDE — what the buyer is purchasing and its price.
//
// PUBLIC by default: a buyer does NOT need to be logged in to check out. Backend function routes
// are callable anonymously, and storefront buyers often have no account — requiring login here is
// what blocks real purchases. If a buyer IS signed in we record their app-user id as the
// fulfillment target; otherwise the webhook grants by the buyer's email. Never 401 here.
//
// CRITICAL: Wix's checkout has NO custom-metadata field, so the returned `checkoutSession.id` is
// the ONLY thing that ties this payment back to this purchase. We persist it on a pending
// Base44Purchase BEFORE redirecting; the webhook resolves the purchase by that same id
// (order.checkoutId === checkoutSession.id). Skipping this write makes fulfillment impossible.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CONSTRUCT_URL = "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct";

// The app's public base URL for the buyer's return links. Use the platform-injected
// `X-Base44-App-Url` header (server-set from app state — correct behind custom domains), then the
// server-owned `WIX_CHECKOUT_APP_URL` secret. We do NOT fall back to the request `Origin`: it's
// caller-controlled, so a spoofed Origin would make Wix send the paid buyer to an attacker page
// (open redirect). Both sources above are always present for a connected payments app.
function resolveAppUrl(req: Request): string {
  return (
    req.headers.get("x-base44-app-url") ||
    Deno.env.get("WIX_CHECKOUT_APP_URL") ||
    ""
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    // Read per request, never at module scope: disconnecting payments blanks these, and a warm
    // isolate that captured them at startup would keep charging with the old credentials.
    const WIX_API_KEY = Deno.env.get("WIX_CHECKOUT_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_CHECKOUT_SITE_ID");
    if (!WIX_API_KEY || !WIX_SITE_ID) {
      console.error("create-checkout: Wix payment config not set");
      return new Response(JSON.stringify({ error: "Payments not configured" }), { status: 500 });
    }

    const appUrl = resolveAppUrl(req);
    if (!appUrl) {
      // Fail closed: with no server-owned app URL (both the X-Base44-App-Url header AND the
      // WIX_CHECKOUT_APP_URL secret are absent — e.g. a slug-less or partially-wired app) we'd build
      // relative return links like `/ThankYou` and strand the paid buyer. Never fall back to the
      // caller-controlled Origin (open redirect). Reconnecting payments repopulates the secret.
      console.error("create-checkout: no app URL (X-Base44-App-Url header and WIX_CHECKOUT_APP_URL both empty)");
      return new Response(JSON.stringify({ error: "Payments not configured" }), { status: 500 });
    }
    const base44 = createClientFromRequest(req);

    // Capture the buyer's app-user id IF signed in — but never REQUIRE it. This is the
    // fulfillment target the webhook grants to; when absent (anonymous buyer) the webhook grants
    // by the email the buyer enters on Wix's checkout page.
    let appUser = null;
    try {
      appUser = await base44.auth.me();
    } catch (_) {
      appUser = null;
    }

    const body = await req.json().catch(() => ({}));

    // ===== APP-SPECIFIC =====
    // Server-side product catalog — authoritative prices, NEVER trust client-sent prices.
    const PRODUCTS: Record<string, { name: string; price: string; subscription?: { frequency: string; interval?: number } }> = {
      "plan-starter":         { name: "Starter Plan — Monthly",       price: "49.00",  subscription: { frequency: "MONTH" } },
      "plan-essential":       { name: "Essential Plan — Monthly",     price: "99.00",  subscription: { frequency: "MONTH" } },
      "plan-professional":    { name: "Professional Plan — Monthly", price: "149.00", subscription: { frequency: "MONTH" } },
      "plan-growth":          { name: "Growth Plan — Monthly",        price: "199.00", subscription: { frequency: "MONTH" } },
      "plan-starter-annual":      { name: "Starter Plan — Annual",       price: "39.20",  subscription: { frequency: "YEAR" } },
      "plan-essential-annual":      { name: "Essential Plan — Annual",     price: "79.20",  subscription: { frequency: "YEAR" } },
      "plan-professional-annual":  { name: "Professional Plan — Annual",   price: "119.20", subscription: { frequency: "YEAR" } },
      "plan-growth-annual":         { name: "Growth Plan — Annual",        price: "159.20", subscription: { frequency: "YEAR" } },
      "payg-sms-1000":         { name: "SMS Credit (1,000 msgs)",         price: "4.00" },
      "payg-mms-1000":         { name: "MMS Credit (1,000 msgs)",         price: "12.00" },
      "payg-whatsapp-1000":    { name: "WhatsApp Credit (1,000 min)",     price: "2.50" },
      "payg-voice-out-1000":   { name: "Outbound Call Credit (1,000 min)",price: "7.00" },
      "payg-voice-in-1000":    { name: "Inbound Call Credit (1,000 min)",  price: "3.20" },
      "payg-recording-1000":   { name: "Call Recording Credit (1,000 min)",price: "2.00" },
      "payg-ai-100":           { name: "Conversational AI Credit (100 min)",price: "5.00" },
      "payg-stt-1000":         { name: "Speech-to-Text Credit (1,000 min)", price: "7.40" },
      "payg-tts-100k":         { name: "Text-to-Speech Credit (100K chars)", price: "0.50" },
      "payg-email-10000":      { name: "Email Credit (10,000 emails)",     price: "13.00" },
      "payg-local-number":     { name: "Local Phone Number — Monthly",    price: "1.00", subscription: { frequency: "MONTH" } },
      "payg-tollfree-number": { name: "Toll-Free Phone Number — Monthly",  price: "1.00", subscription: { frequency: "MONTH" } },
    };

    // Accept either a single product or an array of items (cart).
    const rawItems: Array<{ productId: string; quantity: number }> = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ productId: String(body.productId ?? ""), quantity: Number(body.quantity ?? 1) }];

    // Validate and resolve each item server-side.
    const cartItems: Array<{ name: string; quantity: number; price: string; subscriptionInfo?: any }> = [];
    let total = 0;
    for (const item of rawItems) {
      const pid = String(item.productId ?? "");
      const qty = Number(item.quantity ?? 1);
      if (!Number.isInteger(qty) || qty < 1) {
        return new Response(JSON.stringify({ error: "Invalid quantity" }), { status: 400 });
      }
      const product = PRODUCTS[pid];
      if (!product) {
        return new Response(JSON.stringify({ error: `Unknown product: ${pid}` }), { status: 400 });
      }
      // Plans are fixed-entitlement (quantity 1); PAYG credits allow multi-quantity.
      const effectiveQty = pid.startsWith("plan-") ? 1 : qty;
      const subInfo = product.subscription
        ? { subscriptionSettings: { frequency: product.subscription.frequency, ...(product.subscription.interval ? { interval: product.subscription.interval } : {}) }, title: product.name }
        : undefined;
      cartItems.push({ name: product.name, quantity: effectiveQty, price: product.price, ...(subInfo ? { subscriptionInfo: subInfo } : {}) });
      total += parseFloat(product.price) * effectiveQty;
    }

    // Combined values for the Base44Purchase record.
    const productId = rawItems.map(i => i.productId).join(",");
    const productName = cartItems.map(i => i.name).join(" + ");
    const quantity = cartItems.reduce((s, i) => s + i.quantity, 1);
    const currency = "USD";

    const thankYouPath = "/ThankYou";
    const postFlowPath = "/";
    // ===== END APP-SPECIFIC =====

    if (!(total >= 0.5)) {
      return new Response(JSON.stringify({ error: "Amount must be at least 0.50" }), { status: 400 });
    }

    const constructBody = {
      cart: {
        items: cartItems,
        ...(appUser?.email ? { customerInfo: { email: appUser.email } } : {}),
      },
      callbackUrls: {
        thankYouPageUrl: `${appUrl}${thankYouPath}`,
        postFlowUrl: `${appUrl}${postFlowPath}`,
      },
    };

    const wixRes = await fetch(CONSTRUCT_URL, {
      method: "POST",
      headers: {
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(constructBody),
    });

    if (!wixRes.ok) {
      const errText = await wixRes.text();
      console.error("create-checkout: Wix construct failed", { status: wixRes.status, errText });
      return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 502 });
    }

    const { checkoutSession } = await wixRes.json();
    const checkoutSessionId: string = checkoutSession?.id;
    const redirectUrl: string = checkoutSession?.redirectUrl;

    if (!checkoutSessionId || !redirectUrl) {
      console.error("create-checkout: missing checkoutSession id/redirectUrl", checkoutSession);
      return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 502 });
    }

    // PERSIST THE JOIN KEY (the whole point). Pending until the webhook flips it to "paid".
    // asServiceRole so the row is trustworthy — Base44Purchase RLS blocks client writes, so a buyer
    // can't forge a paid purchase. appUserId is the fulfillment target when known; null for an
    // anonymous buyer (the webhook then grants by buyerEmail).
    await base44.asServiceRole.entities.Base44Purchase.create({
      checkoutSessionId,
      status: "pending",
      appUserId: appUser?.id ?? null,
      buyerEmail: appUser?.email ?? null,
      // The server-resolved product key — the webhook grant reads this to decide what to unlock.
      productId,
      productName,
      // Persist the validated quantity so the webhook's grant can award the RIGHT count
      // (seats/credits/items) for a multi-unit purchase — the grant runs later from this row and has
      // no other authoritative count. (Fixed-entitlement plans keep quantity 1.)
      quantity,
      // Charged total (unit price × quantity), so the record matches what Wix charged.
      amount: total.toFixed(2),
      currency,
    });

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout: unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});