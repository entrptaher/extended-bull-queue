const bull = require("bull");
const path = require('path');
const fs = require('fs');

// Bluebird cancellation is not enabled in bull and 
// in fact, bluebird will be removed completely from future versions 
// and native promises will be used instead.
// see more: solution 2 on https://github.com/OptimalBits/bull/issues/1098#issuecomment-439909638
const Bluebird = require('bluebird');
Bluebird.config({
  cancellation: true
});

// extend the queue constructor to use our custom sandbox
const Queue = require("bull/lib/queue");

Queue.prototype.setHandler = function(name, handler) {
    if (!handler) {
      throw new Error('Cannot set an undefined handler');
    }
    if (this.handlers[name]) {
      throw new Error('Cannot define the same handler twice ' + name);
    }
  
    this.setWorkerName();
  
    if (typeof handler === 'string') {
      const supportedFileTypes = ['.js', '.ts', '.flow'];
      const processorFile =
        handler +
        (supportedFileTypes.includes(path.extname(handler)) ? '' : '.js');
  
      if (!fs.existsSync(processorFile)) {
        throw new Error('File ' + processorFile + ' does not exist');
      }
      
      // fallback to the process specific child pool
      this.childPool = this.childPool || require('bull/lib/process/child-pool')();
      
      // use the custom sandbox
      // copied from the fork: https://github.com/alolis/bull/blob/rapiddot/lib/process/sandbox.js
      const sandbox = require('./sandbox');
      this.handlers[name] = sandbox(handler, this.childPool).bind(this);
    } else {
      handler = handler.bind(this);
  
      if (handler.length > 1) {
        this.handlers[name] = promisify(handler);
      } else {
        this.handlers[name] = function() {
          try {
            return Promise.resolve(handler.apply(null, arguments));
          } catch (err) {
            return Promise.reject(err);
          }
        };
      }
    }
  };

  module.exports = bull;