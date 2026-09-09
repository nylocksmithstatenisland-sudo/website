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
