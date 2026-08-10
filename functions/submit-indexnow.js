// Cloudflare Pages Function
// Deployed at: https://www.locksmithstatenisland.nyc/submit-indexnow
// POST (optional body: { "urls": [...] }) to trigger IndexNow submission
// GET returns status/info

const DEFAULT_URLS = [
  // Core pages
  'https://www.locksmithstatenisland.nyc/',
  'https://www.locksmithstatenisland.nyc/blog',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me',

  // Schema.org validation fixes (3 pages)
  'https://www.locksmithstatenisland.nyc/locksmith-near-me',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/lock-repair',

  // Meta description length fixes (4 pages - trimmed to 120-155 chars)
  'https://www.locksmithstatenisland.nyc/',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/lock-repair',
  'https://www.locksmithstatenisland.nyc/blog/car-theft-prevention-staten-island',

  // Redirect target pages
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith',
  'https://www.locksmithstatenisland.nyc/services/key-duplication-rekeying',
  'https://www.locksmithstatenisland.nyc/services/safe-opening-security',

  // Blog category pages
  'https://www.locksmithstatenisland.nyc/blog/category/emergency-services',
  'https://www.locksmithstatenisland.nyc/blog/category/automotive',
  'https://www.locksmithstatenisland.nyc/blog/category/maintenance',
  'https://www.locksmithstatenisland.nyc/blog/category/security-tips',

  // Key service pages
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith',
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith',
  'https://www.locksmithstatenisland.nyc/services/lock-installation-repair',

  // Popular blog posts
  'https://www.locksmithstatenisland.nyc/blog/emergency-lockout-prevention-tips',
  'https://www.locksmithstatenisland.nyc/blog/car-theft-prevention-staten-island',
];

export async function onRequestPost(context) {
  try {
    // Parse optional body
    let body = {};
    try {
      body = await context.request.json();
    } catch (e) {
      body = {};
    }

    const urls = Array.isArray(body.urls) && body.urls.length > 0 ? body.urls : DEFAULT_URLS;
    const uniqueUrls = [...new Set(urls)];

    const payload = {
      host: 'www.locksmithstatenisland.nyc',
      key: '7f93034c76ad4ceb50831d9713679470',
      keyLocation: 'https://www.locksmithstatenisland.nyc/7f93034c76ad4ceb50831d9713679470.txt',
      urlList: uniqueUrls,
    };

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    // IndexNow returns 200/202 on success, 400/403/422 on error
    const isSuccess = response.status === 200 || response.status === 202;

    return new Response(
      JSON.stringify(
        {
          success: isSuccess,
          httpStatus: response.status,
          message: isSuccess
            ? 'URLs submitted to IndexNow successfully.'
            : `IndexNow returned status ${response.status}.`,
          detail: responseText || '(empty response, success is OK)',
          urlsSubmitted: uniqueUrls.length,
          urls: uniqueUrls,
        },
        null,
        2
      ),
      {
        status: isSuccess ? 200 : 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// GET handler: show info & allow triggering via browser
export async function onRequestGet(context) {
  return new Response(
    JSON.stringify(
      {
        success: true,
        message: 'IndexNow submission endpoint. POST to this URL to submit URLs.',
        usage: 'curl -X POST https://www.locksmithstatenisland.nyc/submit-indexnow',
        defaultUrls: DEFAULT_URLS.length,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}