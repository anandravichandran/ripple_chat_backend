/**
 * Canonical Socket.io event names shared between server and client.
 * See docs/SOCKET_EVENTS.md for full payload documentation.
 */
export const SOCKET_EVENTS = {
	// Connection lifecycle
	CONNECT: "connect",
	DISCONNECT: "disconnect",
	CONNECT_ERROR: "connect_error",
	RECONNECT: "reconnect",
	HEARTBEAT: "heartbeat",
	HEARTBEAT_ACK: "heartbeatAck",

	// Rooms
	JOIN_ROOM: "joinRoom",
	LEAVE_ROOM: "leaveRoom",
	ROOM_CREATED: "roomCreated",
	ROOM_UPDATED: "roomUpdated",
	ROOM_DELETED: "roomDeleted",

	// Messages
	SEND_MESSAGE: "sendMessage",
	RECEIVE_MESSAGE: "receiveMessage",
	MESSAGE_EDITED: "messageEdited",
	MESSAGE_DELETED: "messageDeleted",
	MESSAGE_DELIVERED: "messageDelivered",
	MESSAGE_SEEN: "messageSeen",

	// Typing
	TYPING: "typing",
	STOP_TYPING: "stopTyping",

	// Users
	USER_CREATED: "userCreated",
	USER_UPDATED: "userUpdated",
	USER_ONLINE: "userOnline",
	USER_OFFLINE: "userOffline",
	PRESENCE_SYNC: "presenceSync",

	// Notifications
	NOTIFICATION_NEW: "notification:new",

	// Errors
	SOCKET_ERROR: "socketError",
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
