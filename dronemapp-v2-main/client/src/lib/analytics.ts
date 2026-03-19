/**
 * Analytics helper for tracking demo engagement
 * Tracks user interactions with demo features and conversion funnel
 */

export type AnalyticsEvent = 
  | 'demo_page_view'
  | 'demo_button_click_homepage'
  | 'demo_button_click_feature_page'
  | 'demo_project_view'
  | 'demo_to_signup_click'
  | 'demo_to_trial_click';

interface AnalyticsPayload {
  event: AnalyticsEvent;
  timestamp: number;
  source?: string;
  projectId?: number;
  userId?: string;
}

/**
 * Track analytics event
 * Sends event to analytics endpoint if configured
 */
export const trackEvent = async (event: AnalyticsEvent, metadata?: Record<string, any>) => {
  try {
    const payload: AnalyticsPayload = {
      event,
      timestamp: Date.now(),
      ...metadata,
    };

    // Store in localStorage for offline tracking
    const events = JSON.parse(localStorage.getItem('demo_analytics_events') || '[]');
    events.push(payload);
    localStorage.setItem('demo_analytics_events', JSON.stringify(events.slice(-100))); // Keep last 100 events

    // Send to analytics endpoint if available
    const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (analyticsEndpoint) {
      await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail if analytics endpoint is unavailable
      });
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
};

/**
 * Get stored analytics events for dashboard
 */
export const getStoredAnalyticsEvents = (): AnalyticsPayload[] => {
  try {
    return JSON.parse(localStorage.getItem('demo_analytics_events') || '[]');
  } catch {
    return [];
  }
};

/**
 * Clear stored analytics events
 */
export const clearStoredAnalyticsEvents = () => {
  localStorage.removeItem('demo_analytics_events');
};

/**
 * Get analytics summary
 */
export const getAnalyticsSummary = () => {
  const events = getStoredAnalyticsEvents();
  
  return {
    totalDemoViews: events.filter(e => e.event === 'demo_page_view').length,
    demoButtonClicksHomepage: events.filter(e => e.event === 'demo_button_click_homepage').length,
    demoButtonClicksFeature: events.filter(e => e.event === 'demo_button_click_feature_page').length,
    demoProjectViews: events.filter(e => e.event === 'demo_project_view').length,
    signupClicks: events.filter(e => e.event === 'demo_to_signup_click').length,
    trialClicks: events.filter(e => e.event === 'demo_to_trial_click').length,
    conversionRate: events.length > 0 
      ? (events.filter(e => e.event === 'demo_to_signup_click' || e.event === 'demo_to_trial_click').length / events.filter(e => e.event === 'demo_page_view').length * 100).toFixed(2)
      : '0',
  };
};
