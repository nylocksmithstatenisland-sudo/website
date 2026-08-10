// Cloudflare Pages Function
// Deployed at: https://www.locksmithstatenisland.nyc/submit-indexnow
// POST (optional body: { "urls": [...] }) to trigger IndexNow submission
// GET returns status/info
//
// This function submits ALL URLs from sitemap.xml (73 URLs) to IndexNow.

const ALL_SITEMAP_URLS = [
  // Core pages
  'https://www.locksmithstatenisland.nyc/',
  'https://www.locksmithstatenisland.nyc/about',
  'https://www.locksmithstatenisland.nyc/contact',
  'https://www.locksmithstatenisland.nyc/blog',

  // Main service pages
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/deadbolt-installation',
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith',
  'https://www.locksmithstatenisland.nyc/services/lock-installation-repair',
  'https://www.locksmithstatenisland.nyc/services/key-duplication-rekeying',
  'https://www.locksmithstatenisland.nyc/services/safe-opening-security',

  // Residential sub-services
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/lock-installation',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/door-lock-repair',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/key-duplication',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/lock-rekeying',
  'https://www.locksmithstatenisland.nyc/services/residential-locksmith/smart-lock-installation',

  // Commercial sub-services
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith/high-security-locks',
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith/master-key-systems',
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith/access-control',
  'https://www.locksmithstatenisland.nyc/services/commercial-locksmith/office-lockout',

  // Automotive sub-services
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/car-key-replacement',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/ignition-repair',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/key-fob-programming',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/car-door-unlocking',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/transponder-key-service',
  'https://www.locksmithstatenisland.nyc/services/automotive-locksmith/trunk-unlocking',

  // Lock installation & repair sub-services
  'https://www.locksmithstatenisland.nyc/services/lock-installation-repair/lock-replacement',
  'https://www.locksmithstatenisland.nyc/services/lock-installation-repair/door-reinforcement',

  // Key duplication & rekeying sub-services
  'https://www.locksmithstatenisland.nyc/services/key-duplication-rekeying/key-cutting',
  'https://www.locksmithstatenisland.nyc/services/key-duplication-rekeying/rekey-service',

  // Safe opening & security sub-services
  'https://www.locksmithstatenisland.nyc/services/safe-opening-security/safe-cracking',
  'https://www.locksmithstatenisland.nyc/services/safe-opening-security/safe-repair',
  'https://www.locksmithstatenisland.nyc/services/safe-opening-security/security-consultation',

  // Emergency sub-services
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/home-lockout',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/car-lockout',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/office-lockout',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/lock-repair',
  'https://www.locksmithstatenisland.nyc/services/emergency-locksmith/lockout',

  // Locksmith near me (main + neighborhoods)
  'https://www.locksmithstatenisland.nyc/locksmith-near-me',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/st-george',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/tottenville',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/great-kills',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/new-dorp',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/eltingville',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/midland-beach',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/westerleigh',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/port-richmond',
  'https://www.locksmithstatenisland.nyc/locksmith-near-me/prince-bay',

  // Blog posts
  'https://www.locksmithstatenisland.nyc/blog/cost-to-replace-a-car-key-in-nyc',
  'https://www.locksmithstatenisland.nyc/blog/how-long-does-it-take-to-program-a-car-key',
  'https://www.locksmithstatenisland.nyc/blog/toyota-key-fob-battery-replacement-guide',
  'https://www.locksmithstatenisland.nyc/blog/car-key-replacement-costs-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/emergency-lockout-prevention-tips',
  'https://www.locksmithstatenisland.nyc/blog/smart-locks-guide-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/choosing-right-locksmith-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/commercial-security-tips-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/lock-maintenance-guide-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/emergency-preparedness-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/difference-between-commercial-residential-locks',
  'https://www.locksmithstatenisland.nyc/blog/car-lockout-service-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/car-lockout-locksmith-near-me-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/car-lockout-costs-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/complete-locksmith-services-guide-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/house-lockout-service-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/smart-lock-installation-guide-staten-island',
  'https://www.locksmithstatenisland.nyc/blog/car-theft-prevention-staten-island',

  // Blog categories
  'https://www.locksmithstatenisland.nyc/blog/category/automotive',
  'https://www.locksmithstatenisland.nyc/blog/category/emergency-services',
  'https://www.locksmithstatenisland.nyc/blog/category/maintenance',
  'https://www.locksmithstatenisland.nyc/blog/category/security-tips',

  // Legal pages
  'https://www.locksmithstatenisland.nyc/terms',
  'https://www.locksmithstatenisland.nyc/privacy',
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

    // Use provided URLs if given, otherwise use all sitemap URLs
    const urls = Array.isArray(body.urls) && body.urls.length > 0 ? body.urls : ALL_SITEMAP_URLS;
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
        message: 'IndexNow submission endpoint. POST to this URL to submit all sitemap URLs.',
        usage: 'curl -X POST https://www.locksmithstatenisland.nyc/submit-indexnow',
        totalUrls: ALL_SITEMAP_URLS.length,
        sitemapUrl: 'https://www.locksmithstatenisland.nyc/sitemap.xml',
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