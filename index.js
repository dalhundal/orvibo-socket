var OrviboSocket = require('./lib/orvibo-socket');

OrviboSocket.discover();

OrviboSocket.on('discovered',function(socket) {
	socket.on = true;
	setTimeout(function() {
		socket.on = false;
	},2000);
});