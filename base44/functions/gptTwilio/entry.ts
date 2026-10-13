import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { createTwilioReader } from './reader.mjs';
export default createTwilioReader({
  env: name => process.env[name],
  authenticate: async req => {
    const client = createClientFromRequest(req);
    const bearer = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      const keys = await client.asServiceRole.entities.ApiKey.filter({key_value:bearer,status:'active'});
      const key = keys[0];
      if (!key) return null;
      const tenant = await client.asServiceRole.entities.Tenant.get(key.tenant_id);
      if (!tenant || tenant.status !== 'active') return null;
      return {admin:false,tenantId:key.tenant_id,scopes:key.scopes || []};
    }
    const user = await client.auth.me().catch(() => null);
    return user?.role === 'admin' ? {admin:true} : null;
  }
});
