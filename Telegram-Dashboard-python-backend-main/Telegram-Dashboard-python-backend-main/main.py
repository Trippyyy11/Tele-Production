from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from telethon import TelegramClient, functions, types
import uvicorn
import os
import asyncio
from dotenv import load_dotenv
from typing import Dict
import pathlib

# Load env variables initially
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Global State
API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
BACKEND_URL = os.getenv('BACKEND_URL')
FRONTEND_URL = os.getenv('FRONTEND_URL')

app = FastAPI()

# Strict CORS
origins = [
    FRONTEND_URL,
    BACKEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients: Dict[str, TelegramClient] = {}
session_dir = pathlib.Path(__file__).parent / "user_sessions"
session_dir.mkdir(exist_ok=True)

def get_user_id_from_request(request: Request) -> str:
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(status_code=400, detail="x-user-id header required")
    return user_id

async def get_or_init_client(user_id: str, api_id: str = None, api_hash: str = None) -> TelegramClient:
    if user_id in clients and clients[user_id].is_connected():
        return clients[user_id]

    # Load per-user credentials if not provided
    if not api_id or not api_hash:
        # Fallback: try to read from a simple per-user file or env
        # For now, we rely on the /auth/setup call to have set globals per user
        api_id = API_ID
        api_hash = API_HASH

    if not api_id or not api_hash:
        raise HTTPException(status_code=400, detail="API credentials not configured for user")

    session_path = session_dir / f"session_{user_id}"

    client = TelegramClient(str(session_path), int(api_id), api_hash)
    await client.connect()
    clients[user_id] = client
    print(f"✅ Telethon Client Initialized for user {user_id}")
    return client

@app.on_event("startup")
async def startup_event():
    pass  # No global init; clients are lazy per user

@app.on_event("shutdown")
async def shutdown_event():
    for c in clients.values():
        try:
            await c.disconnect()
        except:
            pass

@app.get("/")
async def health_check(request: Request = None):
    response = {
        "status": "running",
        "service": "analytics-telethon",
        "configured": bool(API_ID and API_HASH),
        "active_sessions": len([c for c in clients.values() if c.is_connected()]),
        "authorized": False
    }

    if request:
        user_id = request.headers.get("x-user-id")
        if user_id:
            client = clients.get(user_id)
            if client and client.is_connected():
                try:
                     # Check auth status - usually cached or fast
                     if await client.is_user_authorized():
                        response["authorized"] = True
                        # Get cached ME if possible, or fetch
                        me = await client.get_me()
                        if me:
                            response["user"] = {
                                "id": str(me.id), 
                                "username": me.username, 
                                "firstName": me.first_name,
                                "lastName": me.last_name
                            }
                except Exception as e:
                    print(f"Status check error for {user_id}: {e}")
    
    return response

# --- Auth Endpoints ---

@app.post("/auth/setup")
async def setup_credentials(data: dict = Body(...), request: Request = None):
    """
    Update API ID/Hash dynamically (called after Node updates .env)
    """
    user_id = get_user_id_from_request(request)
    new_api_id = data.get("api_id")
    new_api_hash = data.get("api_hash")
    
    if not new_api_id or not new_api_hash:
         raise HTTPException(status_code=400, detail="Missing api_id or api_hash")

    try:
        client = await get_or_init_client(user_id, new_api_id, new_api_hash)
        return {"status": "success", "message": "Credentials updated and client initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize client: {str(e)}")


@app.post("/auth/request-code")
async def request_code(data: dict = Body(...), request: Request = None):
    user_id = get_user_id_from_request(request)
    
    # Extract Credentials from Headers
    api_id = request.headers.get("x-api-id")
    api_hash = request.headers.get("x-api-hash")
    
    client = await get_or_init_client(user_id, api_id, api_hash)

    phone = data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")

    try:
        # Send code
        sent = await client.send_code_request(phone)
        return {"phone_code_hash": sent.phone_code_hash}
    except Exception as e:
        print(f"Error requesting code: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/sign-in")
async def sign_in_route(data: dict = Body(...), request: Request = None):
    user_id = get_user_id_from_request(request)
    
    # Extract Credentials from Headers
    api_id = request.headers.get("x-api-id")
    api_hash = request.headers.get("x-api-hash")
    
    client = await get_or_init_client(user_id, api_id, api_hash)

    print(f"Received sign-in data: {data}")
    
    phone = data.get("phone")
    code = data.get("code")
    phone_code_hash = data.get("phone_code_hash")
    
    print(f"Extracted: phone={phone}, code={code}, hash={phone_code_hash}")
    
    if not phone or not code or not phone_code_hash:
        print("Missing required fields!")
        raise HTTPException(status_code=400, detail="Missing phone, code, or hash")

    try:
        user = await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        return {"status": "success", "user": {"id": user.id, "username": user.username}}
    except Exception as e:
        print(f"Error signing in: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/auth/me")
async def get_me(request: Request = None):
    """
    Get current authorized user info.
    """
    user_id = get_user_id_from_request(request)
    client = await get_or_init_client(user_id)

    if not await client.is_user_authorized():
        raise HTTPException(status_code=401, detail="Userbot not authorized")

    try:
        me = await client.get_me()
        return {"id": str(me.id), "username": me.username, "first_name": me.first_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/logout")
async def logout(request: Request = None):
    user_id = get_user_id_from_request(request)
    client = clients.get(user_id)
    if not client:
        return {"status": "ignored", "detail": "No client"}

    try:
        await client.log_out()
        # Remove from dict
        clients.pop(user_id, None)
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dialogs")
async def get_dialogs(request: Request = None):
    """
    Fetch all dialogs (users, groups, channels) from the active session.
    """
    user_id = get_user_id_from_request(request)
    
    # Extract Credentials from Headers (Source of Truth from Node)
    api_id = request.headers.get("x-api-id")
    api_hash = request.headers.get("x-api-hash")
    print(f"[DEBUG] 📥 Python received request. API_ID={api_id}, API_HASH={api_hash[:5] if api_hash else 'None'}...")
    
    # Init client with specific user creds
    client = await get_or_init_client(user_id, api_id, api_hash)

    if not await client.is_user_authorized():
        raise HTTPException(status_code=401, detail="Userbot not authorized")

    try:
        # Telethon get_dialogs - iterate explicitly to ensure all are fetched
        # Explicitly disable filters to get EVERYTHING
        print("🔄 Starting Fresh Dialog Fetch via Telethon (Refined Logic)...")
        
        results = []
        count = 0
        async for dialog in client.iter_dialogs(limit=None, ignore_migrated=False, archived=None):
            entity = dialog.entity
            count += 1
            
            # DEBUG: Print everything to see what is being found
            print(f"[DEBUG] Inspecting: {dialog.id} | {dialog.name}")

            # 1. Filter out chats we've left or are kicked from
            if getattr(entity, 'left', False) or getattr(entity, 'kicked', False):
                print(f"   ❌ Skipped {dialog.id}: Left/Kicked")
                continue

            # 2. Logic to determine if we can send messages
            can_send = False
            entity_type = "user"
            
            if dialog.is_channel:
                entity_type = "channel"
                # Channel or Supergroup
                if getattr(entity, 'broadcast', False):
                    # Broadcast Channel: Only Creator or Admin can post
                    if getattr(entity, 'creator', False) or (getattr(entity, 'admin_rights', None) and entity.admin_rights.post_messages):
                        can_send = True
                    else:
                        pass # Cannot post in this channel
                elif getattr(entity, 'megagroup', False):
                    entity_type = "group" # Supergroup treated as group
                    # Supergroup: Usually can posting unless restricted
                    # Simple check: If we are just a member, we can post.
                    # For simplicity, we assume we can post unless specific restrictions exist.
                    can_send = True
            elif dialog.is_group:
                entity_type = "group"
                # Basic Chat: Everyone can post usually
                can_send = True
            else:
                # Users/Bots
                can_send = True
            
            if can_send:
                # Extract username safely
                username = None
                if hasattr(entity, "username"):
                    username = entity.username
                
                # Extract access_hash safely
                access_hash = None
                if hasattr(entity, "access_hash"):
                    access_hash = str(entity.access_hash)

                if count <= 5:
                    name_display = getattr(entity, 'title', None) or getattr(entity, 'name', 'Unknown')
                    print(f"   -> Found Valid: {dialog.id} | {name_display} | {entity_type}")

                results.append({
                    "telegramId": str(dialog.id),
                    "name": dialog.title or dialog.name or "Unknown",
                    "username": username,
                    "type": entity_type,
                    "accessHash": access_hash
                })
            
        print(f"✅ Telethon Iteration Complete. Valid Dialogs: {len(results)}")
        return results
    except Exception as e:
        print(f"❌ Error fetching dialogs: {e}")
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
async def get_analytics(chat_id: str, message_id: int, request: Request = None):
    """
    Fetch analytics for a specific message.
    """
    try:
        user_id = get_user_id_from_request(request)
        client = await get_or_init_client(user_id)

        if not await client.is_user_authorized():
            raise HTTPException(status_code=401, detail="Userbot not authorized. Please log in.")

        # Resolve chat_id
        peer = None
        try:
            peer = int(chat_id)
        except ValueError:
            peer = chat_id 

        message = await client.get_messages(peer, ids=message_id)
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Extract analytics
        views = getattr(message, 'views', 0) or 0
        forwards = getattr(message, 'forwards', 0) or 0
        
        replies = 0
        if message.replies:
             replies = message.replies.replies or 0

        reactions = 0
        if message.reactions and message.reactions.results:
            reactions = sum(r.count for r in message.reactions.results)

        return {
            "views": views,
            "forwards": forwards,
            "replies": replies,
            "reactions": reactions
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error fetching analytics: {error_msg}")
        if "Cannot find any entity" in error_msg:
             raise HTTPException(status_code=404, detail="Channel/Group not found or not accessible")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/analytics/batch")
async def get_analytics_batch(data: list = Body(...), request: Request = None):
    """
    Fetch analytics for a batch of messages.
    Input: [{"recipientId": "...", "messageId": 123}, ...]
    """
    user_id = get_user_id_from_request(request)
    client = await get_or_init_client(user_id)

    if not await client.is_user_authorized():
        raise HTTPException(status_code=401, detail="Userbot not authorized")

    results = {}
    
    for item in data:
        chat_id = item.get("recipientId")
        msg_id = item.get("messageId")
        
        if not chat_id or not msg_id:
            continue
            
        try:
            # Resolve peer
            peer = None
            try:
                peer = int(chat_id)
            except ValueError:
                peer = chat_id
                
            # Fetch message
            message = await client.get_messages(peer, ids=int(msg_id))
            
            if message:
                # Extract metrics
                views = getattr(message, 'views', 0) or 0
                forwards = getattr(message, 'forwards', 0) or 0
                
                # Replies
                replies = 0
                if message.replies:
                     replies = message.replies.replies or 0
                
                # Reactions
                reactions = 0
                if message.reactions and message.reactions.results:
                    reactions = sum(r.count for r in message.reactions.results)
                
                # Voters (Polls)
                voters = 0
                if message.poll: # Telethon message.poll property
                     if message.poll.results:
                         voters = message.poll.results.total_voters or 0
                # Fallback check for media.poll
                elif message.media and hasattr(message.media, "poll") and message.media.poll.results:
                     voters = message.media.poll.results.total_voters or 0
                    
                results[str(msg_id)] = {
                    "views": views,
                    "forwards": forwards,
                    "replies": replies,
                    "reactions": reactions,
                    "voters": voters
                }
                print(f"✅ Analyzed msg {msg_id}: V={views} R={reactions} P={voters}")
            else:
                print(f"⚠️ Message {msg_id} in {chat_id} not found")
                
        except Exception as e:
            print(f"❌ Failed to analyze {msg_id} in {chat_id}: {e}")
            
    return results


@app.post("/messages/delete")
async def delete_messages(data: dict = Body(...), request: Request = None):
    """
    Delete a list of messages using the user's Telethon session.
    Input: {"messages": [{"recipientId": "...", "messageId": 123}, ...]}
    """
    user_id = get_user_id_from_request(request)
    client = await get_or_init_client(user_id)

    if not await client.is_user_authorized():
        raise HTTPException(status_code=401, detail="Userbot not authorized")

    messages = data.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    results = {"success": 0, "failed": 0, "errors": []}

    # Group messages by peer (recipientId) to batch delete operations
    # Format: { recipientId: [messageId1, messageId2] }
    updates_by_peer = {}

    for msg in messages:
        recipient_id = msg.get("recipientId")
        message_id = msg.get("messageId")
        
        if not recipient_id or not message_id:
            results["failed"] += 1
            continue
            
        if recipient_id not in updates_by_peer:
            updates_by_peer[recipient_id] = []
        updates_by_peer[recipient_id].append(int(message_id))

    for recipient_id, msg_ids in updates_by_peer.items():
        try:
            # Resolve peer - try as int first, then string
            peer = None
            try:
                peer = int(recipient_id)
            except ValueError:
                peer = recipient_id
            
            # Explicitly resolve entity to ensure it's in cache or fetched
            entity = None
            try:
                entity = await client.get_input_entity(peer)
            except Exception as resolve_error:
                print(f"⚠️ Resolution failed for {recipient_id}, trying explicit fetch... {resolve_error}")
                try:
                    # If resolution fails, try fetching dialogs first to populate cache
                    await client.get_dialogs(limit=None) 
                    entity = await client.get_input_entity(peer)
                except Exception as fetch_error:
                     print(f"❌ Could not resolve entity {recipient_id}: {fetch_error}")
                     # Try raw peer as last resort
                     entity = peer

            # Perform deletion
            await client.delete_messages(entity, msg_ids, revoke=True)
            
            print(f"✅ Deleted {len(msg_ids)} messages in {recipient_id}")
            results["success"] += len(msg_ids)
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Failed to delete messages in {recipient_id}: {error_msg}")
            results["failed"] += len(msg_ids)
            results["errors"].append(f"{recipient_id}: {error_msg}")

    return results

@app.post("/channel-stats")
async def get_channel_stats(data: dict = Body(...), request: Request = None):
    print("🔹 Received request for /channel-stats")
    """
    Fetch official Telegram Channel Statistics (Growth, Followers).
    Requires Admin privileges and sufficient channel size.
    """
    user_id = get_user_id_from_request(request)
    client = await get_or_init_client(user_id)

    if not await client.is_user_authorized():
        raise HTTPException(status_code=401, detail="Userbot not authorized")

    channel_id = data.get("channelId")
    if not channel_id:
        raise HTTPException(status_code=400, detail="Channel ID required")

    try:
        # Resolve peer
        peer = None
        try:
            peer = int(channel_id)
        except ValueError:
            peer = channel_id

        # Fetch stats
        # Note: This works for Channels. For Groups, uses GetMegagroupStatsRequest.
        # We try BroadcastStats first.
        
        # Telethon return complex structures. The graphs are 'types.StatsGraph' or 'types.StatsGraphError'.
        # We need to extract the JSON from 'types.StatsGraph(json=...)'.
        
        from telethon.tl.functions.stats import GetBroadcastStatsRequest, GetMegagroupStatsRequest
        from telethon.tl.types import StatsGraph, StatsGraphError
        import json

        stats = None
        try:
            stats = await client(GetBroadcastStatsRequest(channel=peer, dark=False))
        except Exception as e:
            # If failed (e.g. it's a group), try Megagroup stats
            print(f"⚠️ GetBroadcastStats failed for {channel_id}, trying MegagroupStats: {e}")
            try:
                stats = await client(GetMegagroupStatsRequest(channel=peer, dark=False))
            except Exception as e2:
                raise HTTPException(status_code=400, detail=f"Stats not available (Not Admin or too small?): {e2}")

        if not stats:
             print("❌ No stats returned from Telethon call.")
             raise HTTPException(status_code=404, detail="No stats returned")

        # Helper to parse graph
        def parse_graph(graph_obj):
            if isinstance(graph_obj, StatsGraph):
                data = json.loads(graph_obj.json.data)
                print(f"📊 Graph Data Keys: {data.keys()}") 
                if 'columns' in data:
                     print(f"   Columns: {[c[0] for c in data['columns']]}")
                if 'names' in data:
                     print(f"   Names: {data['names']}")
                return data
            elif isinstance(graph_obj, StatsGraphError):
                print(f"⚠️ Graph Error: {graph_obj.error}")
                return {"error": graph_obj.error}
            return None

        print(f"✅ Stats Fetched for {channel_id}. Period: {stats.period.min_date} - {stats.period.max_date}")
        
        # Extract Growth (Total Subscribers) and Followers (Joined/Left)
        # Note: 'growth_graph' is total, 'followers_graph' is net change usually.
        # stats.followers.growth_graph -> usually the detailed subscriber count over time
        # stats.growth_graph -> general growth
        
        # Let's return raw parsed graphs and let frontend process or map them here.
        growth_data = parse_graph(stats.growth_graph)
        followers_data = parse_graph(stats.followers.followers_graph) # Try pulling from interactions or checking other attrs if empty

        return {
            "period": f"{stats.period.min_date} to {stats.period.max_date}",
            "followers": {
                "current": stats.followers.current,
                "previous": stats.followers.previous,
                "growth_graph": growth_data,     
                "followers_graph": followers_data 
            },
        }

    except Exception as e:
        print(f"❌ Failed to fetch stats for {channel_id}: {e}")
        # Return generic structure to prevent frontend crash, but with error
        return JSONResponse(status_code=500, content={"detail": str(e)})
        # Or just raise:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PYTHON_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
