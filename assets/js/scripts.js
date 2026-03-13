function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    const body = document.body;

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
        menu.style.display = 'none';
        body.style.overflow = 'auto'; // Restore background scroll
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        // Create and append the new mobile menu structure
        const newNav = document.createElement('nav');
        newNav.className = 'py-4 space-y-2';
        newNav.innerHTML = `
            <a href="/" class="block px-4 py-2 text-secondary hover:text-primary transition-colors">Home</a>
            <a href="/about.html" class="block px-4 py-2 text-secondary hover:text-primary transition-colors">About</a>
            
            <!-- Services Mega Menu -->
            <div class="px-4 py-2">
                <button onclick="toggleSubMenu('services-submenu')" class="w-full text-left text-secondary font-medium mb-2 flex justify-between items-center">
                    <span>Services</span>
                    <i class="fas fa-plus"></i>
                </button>
                <div id="services-submenu" class="hidden pl-4 border-l border-border ml-2">
                    <!-- Service categories will be injected here -->
                </div>
            </div>

            <!-- Service Areas Mega Menu -->
            <div class="px-4 py-2">
                <button onclick="toggleSubMenu('service-areas-submenu')" class="w-full text-left text-secondary font-medium mb-2 flex justify-between items-center">
                    <span>Service Areas</span>
                    <i class="fas fa-plus"></i>
                </button>
                <div id="service-areas-submenu" class="hidden pl-4 border-l border-border ml-2">
                    <!-- Service areas will be injected here -->
                </div>
            </div>

            <a href="/blog.html" class="block px-4 py-2 text-secondary hover:text-primary transition-colors">Blog</a>
            <a href="/contact.html" class="block px-4 py-2 text-secondary hover:text-primary transition-colors">Contact</a>
            <div class="px-4 pt-4">
                <a href="tel:+17188316269" class="bg-accent text-dark font-semibold px-6 py-3 rounded-md hover:bg-accent-hover transition-colors w-full text-center block">
                    Call (718) 831-6269
                </a>
            </div>
        `;

        // Clear existing mobile menu and append the new one
        mobileMenu.innerHTML = '';
        mobileMenu.appendChild(newNav);

        // Fetch and populate the mega menu content
        populateMegaMenu();
    }
});
function toggleSubMenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        const icon = submenu.previousElementSibling.querySelector('i');
        submenu.classList.toggle('hidden');
        if (icon) {
            icon.classList.toggle('fa-plus');
            icon.classList.toggle('fa-minus');
        }
    }
}


async function populateMegaMenu() {
    try {
        const response = await fetch('/sitemap.xml');
        const sitemapText = await response.text();
        const parser = new DOMParser();
        const sitemap = parser.parseFromString(sitemapText, 'application/xml');
        const urls = Array.from(sitemap.querySelectorAll('loc')).map(loc => loc.textContent);

        const { services, service_areas } = categorizeUrls(urls);

        const servicesSubmenu = document.getElementById('services-submenu');
        for (const service in services) {
            const serviceGroup = document.createElement('div');
            serviceGroup.className = 'py-2';
            
            const serviceUrl = `/services/${service.toLowerCase().replace(/ /g, '-')}.html`;

            const categoryLink = document.createElement('a');
            categoryLink.href = serviceUrl;
            categoryLink.className = 'w-full text-left text-dark-secondary font-medium mb-2 flex justify-between items-center';
            
            const serviceNameSpan = document.createElement('span');
            serviceNameSpan.textContent = service;
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-plus';
            
            categoryLink.appendChild(serviceNameSpan);
            categoryLink.appendChild(icon);

            const sublist = document.createElement('div');
            sublist.className = 'hidden pl-4 border-l border-border ml-2';
            
            services[service].forEach(item => {
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'block py-1 text-sm text-dark-secondary hover:text-primary';
                link.textContent = item.name;
                sublist.appendChild(link);
            });

            icon.onclick = (e) => {
                e.preventDefault();
                sublist.classList.toggle('hidden');
                icon.classList.toggle('fa-plus');
                icon.classList.toggle('fa-minus');
            };

            serviceGroup.appendChild(categoryLink);
            serviceGroup.appendChild(sublist);
            servicesSubmenu.appendChild(serviceGroup);
        }

        const serviceAreasSubmenu = document.getElementById('service-areas-submenu');
        service_areas.forEach(area => {
            const link = document.createElement('a');
            link.href = area.url;
            link.className = 'block py-1 text-sm text-dark-secondary hover:text-primary';
            link.textContent = area.name;
            serviceAreasSubmenu.appendChild(link);
        });

    } catch (error) {
        console.error('Failed to load or parse sitemap:', error);
    }
}

function categorizeUrls(urls) {
    const services = {};
    const service_areas = [];

    urls.forEach(url => {
        if (url.includes('/services/')) {
            const parts = url.split('/services/')[1].split('/');
            const serviceName = parts[0].replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (parts.length > 1) {
                const subServiceName = parts[1].replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!services[serviceName]) {
                    services[serviceName] = [];
                }
                services[serviceName].push({ name: subServiceName, url });
            } else {
                if (!services[serviceName]) {
                    services[serviceName] = [];
                }
            }
        } else if (url.includes('/locksmith-near-me/')) {
            const areaName = url.split('/locksmith-near-me/')[1].replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            service_areas.push({ name: areaName, url });
        }
    });

    return { services, service_areas };
}
