import json
import os
from pathlib import Path
import click
import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi import HTTPException, status, Query, File, UploadFile, Cookie
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse, FileResponse, JSONResponse, Response
import asyncio

from velociterm.helpers.config import AppConfig
from velociterm.helpers.auth_helper import get_current_user
from velociterm.helpers.utils import find_available_port
from velociterm.routers import auth, workspace, search
from velociterm.routers.workspace import create_workspace_for_user, load_sessions_for_user
from velociterm.ssh.ssh_manager import SSHClientManager


class VelociTermApp:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = AppConfig.load_from_yaml(config_path)
        self.app = FastAPI(title=self.config.app_name)
        self.ssh_manager = SSHClientManager()
        self.setup_app()

    def setup_app(self):
        # Setup CORS
        if self.config.server.cors_origins:
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=self.config.server.cors_origins,
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )

        # Mount static files and templates
        self.app.mount("/static", StaticFiles(directory="velociterm/static"), name="static")
        self.templates = Jinja2Templates(directory="velociterm/templates")

        # Include routers
        self.app.include_router(auth.router, prefix="/auth", tags=["auth"])
        self.app.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
        self.app.include_router(search.router, tags=["search"])

        # Setup routes
        self.setup_routes()

    def setup_routes(self):
        @self.app.get("/", response_class=HTMLResponse)
        async def main_page(request: Request, theme: str = "default", access_token: str = Cookie(None)):
            try:
                username = await get_current_user(access_token)
            except HTTPException as e:
                if e.status_code == status.HTTP_401_UNAUTHORIZED:
                    return Response(
                        status_code=status.HTTP_302_FOUND,
                        headers={"Location": "/auth/login"}
                    )

            # Load user workspace and settings
            user_workspace, user_settings = create_workspace_for_user(username)
            theme = user_settings.get("theme", "theme-default.css")
            sessions_config = user_settings.get("sessions", {})
            use_system_file = sessions_config.get("use_system_file", True)

            # Determine sessions file path
            sessions_file = (
                Path(self.config.sessions_dir) / "sessions.yaml"
                if use_system_file
                else Path(user_workspace) / "sessions.yaml"
            )

            if self.config.debug:
                print(f"Current user: {username}")
                print(f"User workspace: {user_workspace}")
                print(f"User settings: {user_settings}")
                print(f"Using sessions file: {sessions_file}")
                print(f"Sessions config: {sessions_config}")

            # Load and process sessions
            sessions = load_sessions_for_user(username, str(sessions_file))
            for folder in sessions:
                for session in folder.get("sessions", []):
                    session.pop("credsid", None)
                    session['json'] = json.dumps(session)

            return self.templates.TemplateResponse("base.html", {
                "request": request,
                "sessions": sessions,
                "theme": theme,
                "title": self.config.app_name
            })

        @self.app.websocket("/ws/terminal/{tab_id}")
        async def websocket_terminal(
            websocket: WebSocket,
            tab_id: str,
            username: str = Depends(get_current_user)
        ):
            await websocket.accept()
            await self.ssh_manager.create_client(tab_id)
            listen_task = asyncio.create_task(
                self.ssh_manager.listen_to_ssh_output(tab_id, websocket)
            )

            try:
                while True:
                    data = await websocket.receive_json()
                    if data['type'] == 'connect':
                        await self.ssh_manager.connect(
                            tab_id,
                            data['hostname'],
                            data['port'],
                            data['username'],
                            data['password'],
                            websocket
                        )
                    elif data['type'] == 'input':
                        await self.ssh_manager.send_input(tab_id, data['data'])
                    elif data['type'] == 'resize':
                        await self.ssh_manager.resize_terminal(
                            tab_id,
                            data['cols'],
                            data['rows']
                        )
            except WebSocketDisconnect:
                await self.ssh_manager.disconnect(tab_id)
                listen_task.cancel()
            except Exception as e:
                print(f"SSH / Websocket error {e}")
                await self.ssh_manager.disconnect(tab_id)
                listen_task.cancel()
            finally:
                if not listen_task.done():
                    listen_task.cancel()
                await self.ssh_manager.disconnect(tab_id)

def run_server():
    port = find_available_port()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
    )

# At the top level of the file, after imports
app_instance = VelociTermApp()  # Create instance of our app class
app = app_instance.app  # Get the FastAPI instance for uvicorn

# CLI to start the application
@click.command()
@click.option('--config', default='config.yaml', help='Path to configuration file')
def start_app(config):
    run_server()

if __name__ == "__main__":
    start_app()