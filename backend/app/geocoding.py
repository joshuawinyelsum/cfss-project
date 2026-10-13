import os
import time
import json
import math
import asyncio
import httpx
from typing import List, Dict, Any, Tuple, Optional
from fastapi import HTTPException, status
from app.logger import logger
from app.rate_limiter import redis_client

# Provider and API Configuration
GEOCODING_PROVIDER = os.getenv("GEOCODING_PROVIDER", "nominatim").lower()
NOMINATIM_BASE_URL = os.getenv("NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org").rstrip("/")
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "CFSS-Field-Survey/1.0 (fieldwork@cfss.knust.edu.gh)")
NOMINATIM_EMAIL = os.getenv("NOMINATIM_EMAIL", "fieldwork@cfss.knust.edu.gh")
MIN_INTERVAL_SECONDS = float(os.getenv("GEOCODING_MIN_INTERVAL_SECONDS", "1.0"))
CACHE_TTL_SECONDS = int(os.getenv("GEOCODING_CACHE_TTL_SECONDS", "86400"))
MAX_QUEUE_WAIT = float(os.getenv("GEOCODING_MAX_QUEUE_WAIT", "5.0"))

ATTRIBUTION = "Data © OpenStreetMap contributors, ODbL 1.0"
LICENCE = "https://www.openstreetmap.org/copyright"

# In-memory fallbacks when Redis is not available
_local_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_local_lock = asyncio.Lock()
_local_next_allowed_time = 0.0

# Lua script for atomic distributed rate limit scheduling across multiple backend workers/instances
LUA_RATE_LIMIT_RESERVATION = """
local next_allowed = tonumber(redis.call('GET', KEYS[1]) or '0')
local now = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local scheduled = now
if next_allowed > now then
    scheduled = next_allowed
end
local new_next = scheduled + interval
redis.call('SET', KEYS[1], tostring(new_next), 'EX', 60)
return tostring(scheduled)
"""

def get_provider_name() -> str:
    return GEOCODING_PROVIDER

def _get_cache_key(query: str, country: str) -> str:
    clean_q = query.lower().strip()
    clean_country = country.lower().strip()
    return f"cfss:geocode:cache:{clean_q}:{clean_country}"

def get_cached_results(query: str, country: str) -> Optional[List[Dict[str, Any]]]:
    cache_key = _get_cache_key(query, country)

    # 1. Check Redis if available
    if redis_client:
        try:
            raw = redis_client.get(cache_key)
            if raw:
                data = json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
                return data
        except Exception as e:
            logger.warning(f"Redis cache lookup failed, falling back to local cache: {e}")

    # 2. Check in-memory local cache
    now = time.time()
    if cache_key in _local_cache:
        expiry, data = _local_cache[cache_key]
        if now < expiry:
            return data
        else:
            _local_cache.pop(cache_key, None)

    return None

def set_cached_results(query: str, country: str, results: List[Dict[str, Any]]) -> None:
    cache_key = _get_cache_key(query, country)

    # 1. Store in Redis if available
    if redis_client:
        try:
            redis_client.set(cache_key, json.dumps(results), ex=CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Redis cache set failed: {e}")

    # 2. Store in local in-memory cache
    _local_cache[cache_key] = (time.time() + CACHE_TTL_SECONDS, results)

async def acquire_geocoding_slot() -> None:
    """Enforces OpenStreetMap Nominatim 1 req/sec policy globally across all CFSS instances."""
    now = time.time()

    # 1. Distributed reservation via Redis if available
    if redis_client:
        try:
            res = redis_client.eval(
                LUA_RATE_LIMIT_RESERVATION,
                1,
                "cfss:geocode:next_allowed",
                str(now),
                str(MIN_INTERVAL_SECONDS)
            )
            scheduled = float(res)
            delay = scheduled - now
            if delay > MAX_QUEUE_WAIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Geocoding rate limit reached across application. Please retry shortly.",
                    headers={"Retry-After": str(int(math.ceil(delay)))}
                )
            if delay > 0:
                await asyncio.sleep(delay)
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Redis distributed rate reservation failed, falling back to local limiter: {e}")

    # 2. In-memory reservation fallback
    global _local_next_allowed_time
    async with _local_lock:
        now = time.time()
        scheduled = max(now, _local_next_allowed_time)
        _local_next_allowed_time = scheduled + MIN_INTERVAL_SECONDS
        delay = scheduled - now
        if delay > MAX_QUEUE_WAIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Geocoding rate limit reached across application. Please retry shortly.",
                headers={"Retry-After": str(int(math.ceil(delay)))}
            )

    if delay > 0:
        await asyncio.sleep(delay)

def _get_mock_results(query: str) -> List[Dict[str, Any]]:
    """Deterministic mock geocoding results for tests and offline development."""
    q_lower = query.lower()
    known_places = {
        "ejisu": {"lat": 6.7142, "lon": -1.5111, "display_name": "Ejisu, Ejisu Municipal, Ashanti Region, Ghana", "type": "town"},
        "kumasi": {"lat": 6.6885, "lon": -1.6244, "display_name": "Kumasi, Ashanti Region, Ghana", "type": "city"},
        "accra": {"lat": 5.6037, "lon": -0.1870, "display_name": "Accra, Greater Accra Region, Ghana", "type": "city"},
        "tamale": {"lat": 9.4008, "lon": -0.8393, "display_name": "Tamale, Northern Region, Ghana", "type": "city"},
        "kotei": {"lat": 6.6710, "lon": -1.5645, "display_name": "Kotei, Oforikrom Municipal, Ashanti Region, Ghana", "type": "suburb"},
        "ayeduase": {"lat": 6.6732, "lon": -1.5610, "display_name": "Ayeduase, Oforikrom Municipal, Ashanti Region, Ghana", "type": "suburb"},
        "sunyani": {"lat": 7.3399, "lon": -2.3268, "display_name": "Sunyani, Bono Region, Ghana", "type": "city"},
        "cape coast": {"lat": 5.1054, "lon": -1.2466, "display_name": "Cape Coast, Central Region, Ghana", "type": "city"}
    }
    for name, data in known_places.items():
        if name in q_lower:
            return [{
                "place_id": hash(name) % 1000000,
                "display_name": data["display_name"],
                "lat": data["lat"],
                "lon": data["lon"],
                "type": data["type"],
                "importance": 0.6
            }]
    return [{
        "place_id": 999999,
        "display_name": f"{query.title()}, Ghana",
        "lat": 6.6900,
        "lon": -1.6200,
        "type": "settlement",
        "importance": 0.5
    }]

async def geocode_settlement(
    query: str,
    country: str = "gh",
    limit: int = 5
) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Geocodes a community/town query with shared caching, global rate-limiting,
    and provider abstraction (Nominatim or Mock). Returns (results, is_cached).
    """
    trimmed = query.strip()
    if not trimmed:
        return [], False

    # 1. Check shared cache first (avoids consuming provider rate limits)
    cached = get_cached_results(trimmed, country)
    if cached is not None:
        return cached, True

    # 2. Check provider mode
    provider = GEOCODING_PROVIDER
    if provider == "disabled":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is currently disabled."
        )

    if provider == "mock":
        results = _get_mock_results(trimmed)
        set_cached_results(trimmed, country, results)
        return results, False

    # 3. Provider: Nominatim (enforces OpenStreetMap policy)
    await acquire_geocoding_slot()

    search_query = f"{trimmed}, Ghana" if country.lower() == "gh" and "ghana" not in trimmed.lower() else trimmed
    params = {
        "q": search_query,
        "format": "json",
        "limit": min(max(1, limit), 10),
        "countrycodes": country
    }
    if NOMINATIM_EMAIL:
        params["email"] = NOMINATIM_EMAIL

    headers = {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{NOMINATIM_BASE_URL}/search", params=params, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Nominatim returned status {resp.status_code}: {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="External geocoding service returned an unexpected response."
                )
            raw_items = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Network error querying Nominatim: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach external map geocoding service. Please enter coordinates manually."
        )

    results = []
    for item in raw_items:
        try:
            results.append({
                "place_id": item.get("place_id"),
                "display_name": item.get("display_name", ""),
                "lat": float(item.get("lat", 0.0)),
                "lon": float(item.get("lon", 0.0)),
                "type": item.get("type"),
                "importance": float(item.get("importance", 0.0)) if item.get("importance") is not None else None
            })
        except (ValueError, TypeError):
            continue

    set_cached_results(trimmed, country, results)
    return results, False
