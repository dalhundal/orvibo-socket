var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var ip = require('ip');
var udpClient = dgram.createSocket('udp4');
var udpServer = dgram.createSocket('udp4');
var util = require('util');

const UDP_PORT = 10000;
const BROADCAST_IP = '255.255.255.255';
const LOCAL_ADDRESS = ip.address();

var _sockets = [];

function setup() {
	udpClient.bind(UDP_PORT,function() {
		udpClient.setBroadcast(true);
	});
	//
	udpServer.bind(UDP_PORT, LOCAL_ADDRESS);
	udpServer.on('message', receiveMessage);
};

function receiveMessage(message, remote) {
	// Ignore messages from ourselves...
	if (ip.isEqual(remote.address, LOCAL_ADDRESS)) {
		return;
	}
	//
	var messageHex = new Buffer(message).toString('hex');
	var messageMatch = messageHex.match(/^6864([0-9a-z]{4})([0-9a-z]{4}).*?(accf[0-9a-z]{8})/);
	if (!messageMatch) {
		return;
	};
	//
	var decoded = {
		length: parseInt(messageMatch[1],16),
		command: messageMatch[2],
		mac: messageMatch[3]
	};
	//
	switch (decoded.command) {
		case '7161':
			// Socket discovered!
			if (_sockets[decoded.mac]) {
				// Already got this socket :-S
				return;
			}
			_sockets[decoded.mac] = new aSocket(remote.address, decoded.mac);
			console.log("FOUND A SOCKET!",_sockets[decoded.mac].toString());
			break;
		case '636c':
			console.log("SUBSCRIPTION CONFIRMED!");
			break;
		default:
			console.log("DIDNT UNDERSTAND MESSAGE",messageHex);
	};
};

function transmit(msg, address) {
	var msgBuffer = new Buffer(msg);
	udpClient.send(msgBuffer, 0, msgBuffer.length, UDP_PORT, address);
};

var aSocket = function(ip, mac) {
	var self = this;

	this.ip = ip;
	this.mac = mac;
	this.name = util.format("Orvibo Socket %s",mac);

	var _state = false;

	Object.defineProperty(this,'on',{
		get: function() {
			return _state;
		},
		set: function(x) {
			_state = x;
		},
		enumerable: true
	});

	this.toString = function() {
		return util.format("[%s] @ [%s], switched %s", this.name, this.ip, this.on ? 'on' : 'off');
	};

	function subscribe() {
		var baMac = hexStringToByteArray(self.mac);
		var baMacReversed = baMac.slice().reverse();
		transmit([].concat(
			['0x68', '0x64', '0x00', '0x1e', '0x63', '0x6c'],
			baMac,
			['0x20', '0x20', '0x20', '0x20', '0x20', '0x20'],
			baMacReversed,
			['0x20', '0x20', '0x20', '0x20', '0x20', '0x20']
		), self.ip);
	};

	setTimeout(function() {
		subscribe();
	},100);

}

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


/**
 * Utility functions
 */
function hexStringToByteArray(hexString) {
	return hexString.match(/([a-z0-9]{2})/gi).map(function(hexBytes) { return '0x'+hexBytes; });
}