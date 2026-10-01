"""
Real-Time WebSocket Streaming Endpoints and Telemetry.
Section 11 — Real-Time Event System.
"""
import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from jose import JWTError

from backend.app.core.security import decode_token, get_current_user_payload, require_roles
from backend.app.engine.events.manager import ws_manager
from backend.app.engine.events.metrics import metrics_tracker
from backend.app.engine.events.types import ClientMessage

logger = logging.getLogger("websocket_endpoints")

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/live")
async def websocket_live_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Authenticated real-time WebSocket event streaming endpoint.
    Accepts JWT authentication via query parameter ?token=<jwt> or via initial JSON auth handshake.
    """
    await websocket.accept()
    authenticated_payload: Optional[Dict[str, Any]] = None

    # 1. Attempt token verification from query param
    if token:
        try:
            authenticated_payload = decode_token(token)
        except Exception:
            await websocket.send_json({
                "event_type": "system.error",
                "message": "Authentication failed: Invalid or expired token."
            })
            await websocket.close(code=1008, reason="Invalid authentication token.")
            return

    # 2. If no query token, wait for initial auth handshake frame
    if not authenticated_payload:
        try:
            auth_msg_raw = await websocket.receive_text()
            try:
                auth_data = json.loads(auth_msg_raw)
                handshake_token = auth_data.get("token")
                if auth_data.get("action") == "auth" and handshake_token:
                    authenticated_payload = decode_token(handshake_token)
            except Exception:
                pass
        except Exception:
            pass

        if not authenticated_payload:
            await websocket.send_json({
                "event_type": "system.error",
                "message": "Authentication required. Provide token via query param or initial auth message."
            })
            await websocket.close(code=1008, reason="Authentication required.")
            return

    # 3. Register Connection in Manager
    try:
        session = await ws_manager.register_connection(websocket, authenticated_payload)
    except ConnectionRefusedError:
        return

    # Send Welcome Greeting & Active Subscriptions Confirmation
    await websocket.send_json({
        "event_type": "system.connected",
        "status": "LIVE",
        "user_id": session.user_id,
        "role": session.role,
        "subscriptions": list(session.subscriptions),
        "message": f"Welcome {session.user_id}. Real-time security stream active."
    })

    # 4. Message & Control Command Listener Loop
    try:
        while True:
            raw_message = await websocket.receive_text()
            if not raw_message:
                continue

            # Heartbeat ping/pong string format
            if raw_message.strip().lower() == "ping":
                await websocket.send_json({"event_type": "system.heartbeat", "status": "PONG"})
                continue

            # Parse JSON control frames
            try:
                data = json.loads(raw_message)
                action = data.get("action")

                if action == "ping":
                    await websocket.send_json({"event_type": "system.heartbeat", "status": "PONG"})
                
                elif action == "subscribe":
                    topic = data.get("topic")
                    if topic:
                        subs = await ws_manager.update_subscriptions(websocket, subscribe=[topic])
                        await websocket.send_json({
                            "event_type": "system.subscription_updated",
                            "subscriptions": list(subs)
                        })

                elif action == "unsubscribe":
                    topic = data.get("topic")
                    if topic:
                        subs = await ws_manager.update_subscriptions(websocket, unsubscribe=[topic])
                        await websocket.send_json({
                            "event_type": "system.subscription_updated",
                            "subscriptions": list(subs)
                        })

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        await ws_manager.remove_connection(websocket)
    except Exception as e:
        logger.debug("WebSocket error for user %s: %s", session.user_id, str(e))
        await ws_manager.remove_connection(websocket)


@router.get("/ws/metrics", tags=["WebSockets"])
async def get_websocket_metrics(
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Retrieves real-time event system telemetry and connection metrics.
    """
    return metrics_tracker.get_snapshot()
