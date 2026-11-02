const U = 'https://dealmosaic-api.onrender.com/api/health';

export default {
  async fetch() {
    const r = await fetch(U);
    return new Response('HTTP ' + r.status + ' — API is awake');
  },
  async scheduled(_e, _env, ctx) {
    ctx.waitUntil(
      fetch(U)
        .then((r) => console.log('ping', r.status))
        .catch((err) => console.log('ping failed', err.message)),
    );
  },
};
