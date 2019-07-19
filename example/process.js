module.exports = function(job) {
  // Processors can also return promises instead of using the done callback
  console.log(job.data);
};
