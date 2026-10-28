export default async function handler(req, res) {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, Pragma, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // 2. Resolve target URL
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');

  // Extract query string excluding internal proxy params
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key !== 'path') {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    }
  }
  const queryString = queryParams.toString() ? '?' + queryParams.toString() : '';
  const targetUrl = `https://mayurmaheta.vercel.app/api/${targetPath}${queryString}`;

  try {
    // 3. Prepare headers
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders.connection;
    delete forwardHeaders['content-length'];

    // Override Origin and Referer with allowed localhost origin so backend accepts the request
    forwardHeaders.origin = 'http://localhost:5173';
    forwardHeaders.referer = 'http://localhost:5173/';

    const options = {
      method: req.method,
      headers: forwardHeaders
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        options.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
        forwardHeaders['content-type'] = 'application/json';
      }
    }

    const backendRes = await fetch(targetUrl, options);
    const data = await backendRes.text();

    // Forward Set-Cookie headers properly
    const rawSetCookies = backendRes.headers.getSetCookie
      ? backendRes.headers.getSetCookie()
      : backendRes.headers.get('set-cookie');

    if (rawSetCookies) {
      res.setHeader('set-cookie', rawSetCookies);
    }

    res.status(backendRes.status);
    const contentType = backendRes.headers.get('content-type') || 'application/json';
    res.setHeader('content-type', contentType);
    return res.send(data);
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: 'Proxy Error: ' + err.message
    });
  }
}
