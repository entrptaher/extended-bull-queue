const Queue = require('../lib/queue');

var sampleQueue = new Queue("sample");
sampleQueue.process(__dirname + "/process.js");
sampleQueue.add({ bar: "foo" });