import { getAccessToken } from '@base44/sdk';

const isNode = typeof window === 'undefined';

const isClearAccessTokenRequested = () =>
	!isNode && new URLSearchParams(window.location.search).get("clear_access_token") === 'true';

const clearStoredAccessToken = () => {
	window.localStorage.removeItem('base44_access_token');
	window.localStorage.removeItem('token');
}

const getAppParams = () => {
	if (isClearAccessTokenRequested()) {
		clearStoredAccessToken();
	}
	return {
		appId: import.meta.env.VITE_BASE44_APP_ID,
		token: getAccessToken(),
		apiKey: import.meta.env.VITE_BASE44_API_KEY,
		functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
		// When running in the sandbox/preview, VITE_BASE44_APP_BASE_URL is set to
		// http://localhost:4400 (container-internal). Override to empty so OAuth
		// login URLs are relative and go through Vite's /api proxy instead of
		// pointing at an unreachable localhost address.
		appBaseUrl: '',
	}
}


export const appParams = {
	...getAppParams()
}
