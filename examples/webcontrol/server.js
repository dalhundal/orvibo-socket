var fs = require('fs');
var http = require("http");
var OrviboSocket = require('../../lib/orvibo-socket');
var util = require('util');

var eventId = 0;
var subscribers = [];

OrviboSocket.discover();
OrviboSocket.on('discovered',function(socket) {
	console.log("Found socket %s", socket.toString());
	sockets.push(socket);
	socket.on('change',function() {
		eventId++;
		for (var i in subscribers) {
			subscribers[i].write(util.format('id: %d\ndata:%s\n\n', eventId,JSON.stringify({
				mac: socket.mac,
				state: socket.state()
			})));
		};
	})
});
var sockets = [];
var id = new Date().valueOf();


http.createServer(function(req, res) {
	if (req.url === '/events') {
		res.writeHead(200, {
			"Content-Type":"text/event-stream",
			"Cache-Control":"no-cache",
			"Connection":"keep-alive"
		});
		res.write("\n");
		subscribers.push(res);
	} else if (req.url === '/sockets') {
		res.writeHead(200, {
			"Content-Type":"text/event-stream",
			"Cache-Control":"no-cache"
		});
		res.write(JSON.stringify(sockets.map(function(socket) {
			return {
				mac: socket.mac,
				ip: socket.ip,
				name: socket.name,
				state: socket.state()
			};
		})));
		res.end();
	} else if (req.url.match(/^\/toggle\?socket=/)) {
		var mac = req.url.match(/^\/toggle\?socket=(.*)/)[1];
		for (var i in sockets) {
			if (sockets[i].mac === mac) {
				sockets[i].state(!sockets[i].state());
				res.writeHead(200);
				res.end();
				break;
			}
		};
		res.writeHead(404);
		res.end();
	} else if (req.url === '/') {
		fs.readFile(__dirname + '/index.html',function(error, content) {
			if (error) {
				res.writeHead(500);
				res.end();
			} else {
				res.writeHead(200,{'Content-Type':'text/html'});
				res.end(content,'utf-8');
			};
		});
	} else {
		res.writeHead(404);
		res.end();
	}
}).listen(10101,function() {
	console.log("LISTENING ON http://localhost:10101")
});