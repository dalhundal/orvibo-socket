var util = require('util');
var EventEmitter = require('events').EventEmitter;
var dgram = require('dgram');
var udpClient = dgram.createSocket('udp4');
var udpServer = dgram.createSocket('udp4');

const UDP_PORT = 10000;
const BROADCAST_IP = '255.255.255.255';
const LOCAL_ADDRESS = require('ip').address();

function setup() {
	udpClient.bind(UDP_PORT,function() {
		udpClient.setBroadcast(true);
	});
	//
	udpServer.bind(UDP_PORT, LOCAL_ADDRESS);
	udpServer.on('message', receiveMessage);
	console.log("Setup complete");
};

function receiveMessage(message, remote) {
	console.log("RECEIVED MESSAGE");
	console.log(message);
	console.log(remote);
};

function transmit(msg, address) {
	var msgBuffer = new Buffer(msg);
	udpClient.send(msgBuffer, 0, msgBuffer.length, UDP_PORT, address);
};


var OrviboSocket = {};
OrviboSocket.discover = function() {
	setup();
	transmit(
		['0x68', '0x64', '0x00', '0x06', '0x71', '0x61'],
		BROADCAST_IP
	);
	//OrviboSocket.emit('discovered',socket);
};

module.exports = OrviboSocket;