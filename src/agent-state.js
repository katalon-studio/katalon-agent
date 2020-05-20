module.exports = {
  numExecutingJobs: 0,
  threshold: 1,

  addExecutingJobs() {
    this.numExecutingJobs += 1;
  },

  subtractExecutingJobs() {
    this.numExecutingJobs -= 1;
  },
};
