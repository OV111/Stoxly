/**
 * Name of the short-lived cookie holding the Google OAuth `state` value.
 * Shared so the route that sets it and the callback that verifies it can
 * never drift apart.
 */
export const GOOGLE_STATE_COOKIE = "google_oauth_state";
