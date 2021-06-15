var Queue = require('bull');

var sosQueue = new Queue('sos-call', { redis: { port: 6379, host: '127.0.0.1', password: 'foobared' } }); // Specify Redis connection using object
sosQueue.process(function (job, done) {
	// transcode image asynchronously and report progress
	job.progress(42);

	// call done when finished
	done();

	// or give a error if error
	done(new Error('error sos'));

	// or pass it a result
	done(null, { width: 1280, height: 720 /* etc... */ });

	// If the job throws an unhandled exception it is also handled correctly
	throw new Error('some unexpected error');
});