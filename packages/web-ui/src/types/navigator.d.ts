interface NetworkInformation extends EventTarget {
  readonly effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  readonly rtt?: number; // Round-trip time in milliseconds
  readonly downlink?: number; // Downlink speed in megabits per second
  readonly saveData?: boolean;
  onchange?: EventListener;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}