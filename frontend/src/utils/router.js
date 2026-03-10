/**
 * Simple hash-based SPA router
 */
export class Router {
    constructor(routes, defaultRoute = '/pomodoro') {
        this.routes = routes;
        this.defaultRoute = defaultRoute;
        this.currentCleanup = null;

        window.addEventListener('hashchange', () => this.navigate());
        window.addEventListener('load', () => {
            if (!window.location.hash) {
                window.location.hash = `#${defaultRoute}`;
            } else {
                this.navigate();
            }
        });
    }

    navigate() {
        const hash = window.location.hash.slice(1) || this.defaultRoute;
        let route = this.routes[hash];
        let params = {};

        if (!route) {
            for (const [path, handler] of Object.entries(this.routes)) {
                if (path.includes('/:')) {
                    const basePath = path.split('/:')[0];
                    if (hash.startsWith(basePath + '/')) {
                        route = handler;
                        params.id = hash.split('/')[2];
                        break;
                    }
                }
            }
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            const page = link.dataset.page;
            link.classList.toggle('active', hash === `/${page}`);
        });

        if (route) {
            // Cleanup previous page
            if (this.currentCleanup) {
                this.currentCleanup();
                this.currentCleanup = null;
            }
            // Render new page
            const cleanup = route(params);
            if (typeof cleanup === 'function') {
                this.currentCleanup = cleanup;
            }
        }
    }
}
