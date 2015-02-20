var OrviboSocket = require('./lib/orvibo-socket');

OrviboSocket.discover();

OrviboSocket.on('discovered',function(socket) {
	socket.state = true;
	setTimeout(function() {
		socket.state = false;
	},2000);
	//
	socket.on('change',function() {
		console.log("State change of socket",socket.name);
	});
});