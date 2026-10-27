import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  TWILIO_CONSOLE_URL,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Billing Gateway — Twilio only
// Actions: check_twilio_balance, get_usage, list_usage_categories,
//          list_invoices, generate_invoice, recharge_twilio
// ─────────────────────────────────────────────────────────────────────────────

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!apiKey) return Response.json({ error: 'api_key required' }, { status: 401 });

    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: 'active' });
    if (!keys.length) return Response.json({ error: 'invalid api key' }, { status: 403 });
    const key = keys[0];

    let tenant;
    try { tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id); }
    catch (_) { return Response.json({ error: 'tenant not found' }, { status: 403 }); }
    if (!tenant || tenant.status !== 'active') {
      return Response.json({ error: 'tenant not active' }, { status: 403 });
    }

    const config = twilioConfig();
    if (!config.configured) return Response.json(credentialsRequired({ action: body.action }), { status: 503 });

    let action = body.action || 'check_twilio_balance';
    // Strip the legacy provider prefix from older callers.
    action = action.replace(/^check_telnyx_/, 'check_twilio_').replace(/^recharge_telnyx$/, 'recharge_twilio');

    // ── BALANCE ──
    if (action === 'check_twilio_balance') {
      const res = await twilioRequest('/Balance.json');
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const balance = parseFloat(res.data?.balance || '0');
      const currency = res.data?.currency || 'USD';

      // Mirror into the tenant's BillingAccount for local margin math.
      try {
        const accounts = await base44.asServiceRole.entities.BillingAccount.filter({ tenant_id: tenant.id });
        if (accounts.length) {
          await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
            balance_cents: Math.round(balance * 100),
          });
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({
        status: 'ok',
        balance,
        currency,
        balance_cents: Math.round(balance * 100),
        account_sid: config.sid,
        low_balance: balance < 20,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── USAGE ──
    if (action === 'get_usage') {
      const category = body.category; // e.g. sms, calls, phonenumbers
      const path = category ? `/Usage/Records/${category}.json` : '/Usage/Records.json';

      const params: Record<string, string | number> = { PageSize: Math.min(body.limit || 50, 100) };
      if (body.start_date) params.StartDate = body.start_date;
      if (body.end_date) params.EndDate = body.end_date;

      const res = await twilioRequest(path, { method: 'GET', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const records = (res.data?.usage_records || []).map((r) => ({
        category: r.category,
        description: r.description,
        count: Number(r.count || 0),
        usage: r.usage,
        usage_unit: r.usage_unit,
        price: Number(r.price || 0),
        price_unit: r.price_unit,
        start_date: r.start_date,
        end_date: r.end_date,
      }));

      const total = records.reduce((sum, r) => sum + (r.price || 0), 0);

      return Response.json({
        records,
        count: records.length,
        total_price: Number(total.toFixed(4)),
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── USAGE CATEGORY LIST ──
    if (action === 'list_usage_categories') {
      const res = await twilioRequest('/Usage/Records.json', { method: 'GET', params: { PageSize: 1000 } });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      const categories = [...new Set((res.data?.usage_records || []).map((r) => r.category))].sort();
      return Response.json({ categories, count: categories.length, classification: 'LIVE' });
    }

    // ── INVOICES (local records; Twilio's invoice API is account-plan dependent) ──
    if (action === 'list_invoices') {
      const invoices = await base44.asServiceRole.entities.Invoice.filter(
        { tenant_id: tenant.id },
        { sort: '-created_date', limit: 50 }
      );
      const items = Array.isArray(invoices) ? invoices : (invoices?.items || []);
      return Response.json({
        invoices: items,
        count: items.length,
        source: 'internal_ledger',
        note: 'Twilio account statements live in the Twilio Console under Billing.',
        console_url: `${TWILIO_CONSOLE_URL}billing`,
      });
    }

    // ── GENERATE INVOICE (from local metered usage) ──
    if (action === 'generate_invoice') {
      const startDate = body.start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const endDate = body.end_date || new Date().toISOString().slice(0, 10);

      const meters = await base44.asServiceRole.entities.UsageMeter.filter(
        { tenant_id: tenant.id, metered_at: { $gte: `${startDate}T00:00:00.000Z`, $lte: `${endDate}T23:59:59.999Z` } },
        { limit: 500 }
      );
      const rows = Array.isArray(meters) ? meters : (meters?.items || []);
      const totalMicros = rows.reduce((sum, r) => sum + (r.customer_amount_micros || 0), 0);

      const invoice = await base44.asServiceRole.entities.Invoice.create({
        tenant_id: tenant.id,
        amount_cents: Math.round(totalMicros / 10000),
        status: 'open',
        period_start: startDate,
        period_end: endDate,
        line_items: rows.slice(0, 200).map((r) => ({
          description: `${r.channel} ${r.direction || ''} · ${r.units || 0} units`,
          amount_cents: Math.round((r.customer_amount_micros || 0) / 10000),
        })),
      });

      return Response.json({ status: 'generated', invoice, classification: 'LIVE' });
    }

    // ── RECHARGE (Twilio has no top-up API — console only) ──
    if (action === 'recharge_twilio') {
      return Response.json({
        status: 'manual_action_required',
        provider: 'twilio',
        error: 'Twilio does not expose an auto-recharge API',
        action_required: 'Add funds to the Twilio account in the Console',
        console_url: `${TWILIO_CONSOLE_URL}billing`,
        requested_amount_cents: body.amount_cents || null,
      }, { status: 409 });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayBilling] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}