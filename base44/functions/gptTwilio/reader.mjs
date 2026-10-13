// Read-only Twilio adapter. No provider mutation or entity writes.
export const EXPECTED_ACCOUNT = 'AC43985cc94fe8a09ae08fa2e45b6df156';
export const EXPECTED_NUMBER = '+18665711174';
const json = (data, status = 200) => Response.json(data, { status });
export function createTwilioReader({ authenticate, env, fetcher = fetch }) {
  return async function(req) {
    try {
      if (req.method !== 'POST') return json({error:'POST required'},405);
      const identity = await authenticate(req);
      if (!identity) return json({error:'Unauthorized'},401);
      if (!identity.admin && !(identity.scopes || []).includes('twilio:read'))
        return json({error:'twilio:read scope required'},403);
      if (!identity.admin && (!env('TWILIO_TENANT_ID') || identity.tenantId !== env('TWILIO_TENANT_ID')))
        return json({error:'Twilio tenant binding required'},403);
      let body;
      try { body = await req.json(); } catch { return json({error:'Invalid JSON'},400); }
      const action = body.action || 'status';
      if (!['status','inspect_number'].includes(action)) return json({error:'Read-only action required'},400);
      const number = body.number || EXPECTED_NUMBER;
      if (number !== EXPECTED_NUMBER) return json({error:'Number outside approved scope'},403);
      const sid = env('TWILIO_ACCOUNT_SID');
      const token = env('TWILIO_AUTH_TOKEN');
      const keySid = env('TWILIO_API_KEY_SID');
      const keySecret = env('TWILIO_API_KEY_SECRET');
      if (!sid || !(token || (keySid && keySecret)))
        return json({status:'credentials_required',provider:'twilio',live_voice:'UNKNOWN'},503);
      if (sid !== EXPECTED_ACCOUNT) return json({error:'Account outside approved scope'},403);
      const path = action === 'status' ? '.json' :
        '/IncomingPhoneNumbers.json?' + new URLSearchParams({PhoneNumber:number,PageSize:'1'});
      const auth = keySid && keySecret ? keySid + ':' + keySecret : sid + ':' + token;
      const res = await fetcher('https://api.twilio.com/2010-04-01/Accounts/' + sid + path, {
        method:'GET',headers:{Authorization:'Basic ' + btoa(auth)},signal:AbortSignal.timeout(10000),
        redirect:'error'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({status:'provider_error',provider_status:res.status,code:data.code || null},502);
      if (action === 'status') {
        if (data.sid !== EXPECTED_ACCOUNT) return json({error:'Provider account mismatch'},502);
        return json({provider:'twilio',account_verified:true,account_status:data.status,
          account_type:data.type,live_voice:'UNKNOWN',number_suffix:'1174'});
      }
      const record = (data.incoming_phone_numbers || []).find(n =>
        n.phone_number === EXPECTED_NUMBER && n.account_sid === EXPECTED_ACCOUNT);
      if (!record) return json({status:'number_not_found',ownership_verified:false},404);
      // Routing inspection is masked; do not return credential-bearing webhook URLs.
      const route = value => {
        if (!value) return null;
        try { const u = new URL(value); return {protocol:u.protocol,host:u.hostname,
          excluded:u.hostname === 'digital-dominance-2-0.base44.app' ||
            u.pathname.includes('6abe63b2c9b013207fdf4e06'),
          configured:true}; } catch { return {configured:true,valid_url:false}; }
      };
      return json({provider:'twilio',number_suffix:'1174',ownership_verified:true,
        capabilities:record.capabilities || {},voice_route:route(record.voice_url),
        voice_method:record.voice_method || null,voice_application_configured:!!record.voice_application_sid,
        fallback_route:route(record.voice_fallback_url),status_callback:route(record.status_callback),
        live_voice:'UNKNOWN',routing_changed:false});
    } catch {
      return json({status:'connection_failed',error:'Twilio read failed; inspect protected server logs'},502);
    }
  };
}
