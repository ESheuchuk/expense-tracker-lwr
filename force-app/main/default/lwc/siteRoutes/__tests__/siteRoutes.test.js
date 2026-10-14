import { PAGES, namedPage, logout, redirect } from 'c/siteRoutes';

jest.mock('@salesforce/community/basePath', () => ({ __esModule: true, default: '/vforcesite' }), {
    virtual: true
});

describe('c-site-routes', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        delete window.location;
        window.location = { assign: jest.fn() };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    it('builds a named page reference', () => {
        expect(namedPage(PAGES.LOGIN)).toEqual({
            type: 'comm__namedPage',
            attributes: { name: 'Login' }
        });
    });

    it('logs out through secur/logout.jsp under the base path', () => {
        logout();
        expect(window.location.assign).toHaveBeenCalledWith('/vforcesite/secur/logout.jsp');
    });

    it('redirects with a full page load', () => {
        redirect('/frontdoor');
        expect(window.location.assign).toHaveBeenCalledWith('/frontdoor');
    });
});
