import type NsApp from './app';

module.exports = {
  async testApiKey({ homey, body }: { homey: { app: unknown }; body?: { key?: unknown } }) {
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    if (!key) return { ok: false, status: 401 };
    return (homey.app as NsApp).getApi().checkApiKey(key);
  },
};
