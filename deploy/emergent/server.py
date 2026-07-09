# Shim de deploiement UNIQUEMENT : le superviseur de la plateforme lance
# obligatoirement uvicorn sur le port 8001. Ce fichier demarre le vrai backend
# Node/Express (src/server.js) et lui relaie toutes les requetes HTTP.
# Aucune logique metier ici — le code applicatif Node n'est pas modifie.
import asyncio
import os
import socket
import subprocess

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

NODE_PORT = 5050
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()
client = httpx.AsyncClient(base_url=f"http://127.0.0.1:{NODE_PORT}", timeout=60.0)
node_proc = None


def port_ouvert():
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", NODE_PORT)) == 0


@app.on_event("startup")
async def demarrer_node():
    global node_proc
    subprocess.run(["pkill", "-f", "node src/server.js"], capture_output=True)
    await asyncio.sleep(0.3)
    node_proc = subprocess.Popen(["node", "src/server.js"], cwd=BASE_DIR)
    for _ in range(60):
        if port_ouvert():
            return
        await asyncio.sleep(0.5)


@app.on_event("shutdown")
async def arreter_node():
    if node_proc:
        node_proc.terminate()
    await client.aclose()


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    url = f"/{path}"
    if request.url.query:
        url += f"?{request.url.query}"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    body = await request.body()
    try:
        resp = await client.request(request.method, url, headers=headers, content=body)
    except httpx.HTTPError:
        return Response(
            content=b'{"message":"Backend Node en cours de demarrage, reessayez"}',
            status_code=503,
            media_type="application/json",
        )
    resp_headers = {
        k: v for k, v in resp.headers.items()
        if k.lower() not in ("content-encoding", "transfer-encoding", "content-length", "connection")
    }
    return Response(content=resp.content, status_code=resp.status_code, headers=resp_headers)
