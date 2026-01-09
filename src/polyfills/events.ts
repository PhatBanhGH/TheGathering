// Polyfill for Node.js events module in browser
// Provides EventEmitter implementation for simple-peer and other Node.js modules

// Use function-based class to ensure it can be called with or without 'new'
function EventEmitter() {
  if (!(this instanceof EventEmitter)) {
    return new EventEmitter();
  }
  this.events = new Map();
}

EventEmitter.prototype.on = function(event: string, listener: Function) {
  if (!this.events.has(event)) {
    this.events.set(event, []);
  }
  this.events.get(event)!.push(listener);
  return this;
};

EventEmitter.prototype.once = function(event: string, listener: Function) {
  const self = this;
  const onceWrapper = function(...args: any[]) {
    listener.apply(this, args);
    self.off(event, onceWrapper);
  };
  return this.on(event, onceWrapper);
};

EventEmitter.prototype.off = function(event: string, listener?: Function) {
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
};

EventEmitter.prototype.removeListener = function(event: string, listener: Function) {
  return this.off(event, listener);
};

EventEmitter.prototype.emit = function(event: string, ...args: any[]) {
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
};

EventEmitter.prototype.removeAllListeners = function(event?: string) {
  if (event) {
    this.events.delete(event);
  } else {
    this.events.clear();
  }
  return this;
};

EventEmitter.prototype.listenerCount = function(event: string) {
  return this.events.get(event)?.length || 0;
};

EventEmitter.prototype.listeners = function(event: string) {
  return [...(this.events.get(event) || [])];
};

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

