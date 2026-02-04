// Polyfill for Node.js events module in browser
// Provides EventEmitter implementation for simple-peer and other Node.js modules

class EventEmitter {
  events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  once(event: string, listener: Function) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onceWrapper = function(this: any, ...args: any[]) {
      listener.apply(this, args);
      self.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  off(event: string, listener?: Function) {
    if (!this.events.has(event)) return this;
    
    if (listener) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.events.delete(event);
    }
    return this;
  }

  removeListener(event: string, listener: Function) {
    return this.off(event, listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, ...args: any[]) {
    if (!this.events.has(event)) return false;
    
    const listeners = [...this.events.get(event)!];
    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string) {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string) {
    return [...(this.events.get(event) || [])];
  }
}

// Export EventEmitter class
export { EventEmitter };

// Default export for ES modules - simple-peer expects events.EventEmitter
const eventsModule = {
  EventEmitter: EventEmitter as any,
};

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  // @ts-ignore
  module.exports = eventsModule;
  // @ts-ignore
  module.exports.EventEmitter = EventEmitter;
}

export default eventsModule;

