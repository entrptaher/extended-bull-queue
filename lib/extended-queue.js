const Queue = require("./queue");
const _ = require("lodash");

/**
 * The class will extend the main `Queue` class from bull in order to work around
 * a few limitations of the underlying library.
 */
class ExtendedQueue extends Queue {
  /**
   * Override the default constructor in order to keep track of the job promises
   * for all active jobs. The reason we do this is because we need to be able
   * to cancel a job whenever required (e.g. when a job is removed).
   *
   * @override
   * @param  {Array} args - Array of arguments that will be passed to parent class.
   */
  constructor(...args) {
    super(...args);

    this.activeJobPromises = {};

    this.on("active", (job, jobPromise) => {
      _.set(this.activeJobPromises, parseInt(job.id), jobPromise);
    });

    const unsetEvents = ["completed", "stalled", "removed", "failed"];
    _.forEach(unsetEvents, unsetEvent => {
      this.on("completed", job => {
        _.unset(this.activeJobPromises, parseInt(job.id));
      });
    });
  }

  /**
   * Returns the promise for an active job.
   *
   * @param {string|number} jobId - The job id.
   * @returns {Object} - Returns the job object or undefined if the job is not found.
   */
  getActiveJobPromise(jobId) {
    return _.get(this.activeJobPromises, parseInt(jobId));
  }
}

/**
 * The class will extend the `Job` class from the bull module in order to work around
 * a few limitations of the underlying library.
 */
class ExtendedJob extends Queue.Job {
  /**
   * Will cancel an active job promise.
   */
  async cancel() {
    if (await this.isActive()) {
      const activeJobPromise = this.queue.getActiveJobPromise(this.id);
      activeJobPromise.cancel();

      try {
        await this.finished();
      } catch (e) {
        // We do not care at this point; we just need to wait until queue does its thing
        // and locks have been released.
      }
    }
  }

  /**
   * Remove a job from queue, even if its in progress.
   *
   * @override
   */
  async remove() {
    await this.cancel();
    await super.remove();
  }
}

// Override the default Job prototype in order for all Job objects to actually be ExtendedJob objects
ExtendedQueue.Job.prototype = ExtendedJob.prototype;

module.exports = ExtendedQueue;