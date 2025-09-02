import json
from typing import Dict, List
from fastapi import WebSocket

class RoomConnectionManager:
    """Manages active WebSocket connections for contract rooms."""
    def __init__(self):
        # Maps a string identifier (e.g., contract_id) to a list of active connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """Accepts a new WebSocket connection and adds it to a room."""
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        """Removes a WebSocket connection from a room."""
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            # Clean up the room if it's empty
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: dict, room_id: str):
        """Broadcasts a JSON message to all clients in a specific room."""
        if room_id in self.active_connections:
            message_str = json.dumps(message, default=str)
            for connection in self.active_connections[room_id]:
                await connection.send_text(message_str)

class UserConnectionManager:
    """Manages active WebSocket connections for individual users."""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_to_user(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(json.dumps(message, default=str))

# Create shared instances of the managers
room_manager = RoomConnectionManager()
user_manager = UserConnectionManager()