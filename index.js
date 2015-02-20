var OrviboSocket = require('./lib/orvibo-socket');

OrviboSocket.discover();

OrviboSocket.on('discovered',function(socket) {
	console.log("Discovered socket %s", socket.toString());
	
	socket.on('change',function(ev) {
		console.log("[%s] is %s", socket.name, ev ? 'ON' : 'OFF');
	});

	console.log("Switching on...");
	socket.state(true);


	setTimeout(function() {
		console.log("Switching off..");
		socket.state(false);
	},2000);

});