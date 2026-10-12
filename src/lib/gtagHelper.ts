/// <reference types="node" />

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (gaMeasurementId: string, url: string) => {
  if (typeof window !== "undefined") {
    (window as any).gtag("config", gaMeasurementId, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label: string;
  value: number;
}) => {
  if (typeof window !== "undefined") {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};