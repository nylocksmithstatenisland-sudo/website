// Mobile navigation
function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.querySelector('[aria-controls="mobile-menu"]');
    if (!menu) return;
    const open = menu.classList.toggle('hidden') === false;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleSubMenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    const btn = submenu.previousElementSibling;
    const icon = btn ? btn.querySelector('i') : null;
    const open = submenu.classList.toggle('hidden') === false;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (icon) {
        icon.classList.toggle('fa-plus', !open);
        icon.classList.toggle('fa-minus', open);
    }
}

// Close the mobile menu when the viewport grows to desktop
window.addEventListener('resize', function () {
    const menu = document.getElementById('mobile-menu');
    if (menu && window.innerWidth >= 768 && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        const btn = document.querySelector('[aria-controls="mobile-menu"]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
});

// Conversion tracking: phone taps and contact-form submits as GA4 events.
// Without these, "calls from the website" are invisible in analytics.
document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a || typeof window.gtag !== 'function') return;
    window.gtag('event', 'call_click', {
        event_category: 'conversion',
        link_id: a.id || '',
        page_path: location.pathname,
        link_text: (a.textContent || '').trim().slice(0, 60)
    });
}, true);

document.addEventListener('submit', function (e) {
    const f = e.target;
    if (!f || f.tagName !== 'FORM' || typeof window.gtag !== 'function') return;
    window.gtag('event', 'generate_lead', {
        event_category: 'conversion',
        form_id: f.id || f.getAttribute('name') || '',
        page_path: location.pathname
    });
}, true);
