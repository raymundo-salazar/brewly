/** Represents an asynchronous operating-system activity action. */
export type ActivityAction = () => Promise<void>;

/** Lists the supported activity action names. */
export type ActionName = 'none' | 'caffeinate' | 'hid-event' | 'hid-event-static';
