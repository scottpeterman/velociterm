#!/usr/bin/env python3
"""
SSH Client Manager optimized for text-based games like Angband
"""

import paramiko
import asyncio
import base64
import logging
from typing import Dict, Optional
import io

logger = logging.getLogger(__name__)


class SSHClientManager:
    """SSH client manager optimized for real-time game performance"""

    def __init__(self):
        self.clients: Dict[str, Dict] = {}

    async def create_client(self, window_id: str):
        """Create a new SSH client for the window"""
        logger.info(f"Creating SSH client for window {window_id}")
        self.clients[window_id] = {
            'client': None,
            'channel': None,
            'connected': False
        }

    async def connect(self, window_id: str, hostname: str, port: int, username: str, password: str, websocket,
                      ssh_key_path: Optional[str] = None):
        """Connect to SSH host with game-optimized settings"""
        logger.info(f"=== SSH Connect Attempt (Game Optimized) ===")
        logger.info(f"Window: {window_id}")
        logger.info(f"Target: {hostname}:{port}")
        logger.info(f"Username: {username}")

        if window_id not in self.clients:
            await self.create_client(window_id)

        try:
            # Create SSH client with game-optimized settings
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            logger.info("Attempting SSH connection...")

            # Try SSH key authentication first if available
            pkey = None
            if ssh_key_path:
                logger.info(f"SSH key path provided: {ssh_key_path}")

                try:
                    # Load key directly from file - the way Paramiko expects!
                    key_types = [
                        (paramiko.RSAKey, "RSA"),
                        (paramiko.Ed25519Key, "ED25519"),
                        (paramiko.ECDSAKey, "ECDSA")
                    ]

                    for key_class, key_type in key_types:
                        try:
                            pkey = key_class.from_private_key_file(ssh_key_path)
                            logger.info(f"✓ Successfully loaded {key_type} key from file!")
                            break
                        except paramiko.PasswordRequiredException:
                            logger.warning(f"{key_type} key at {ssh_key_path} requires passphrase (not supported)")
                            break
                        except paramiko.SSHException as e:
                            logger.debug(f"Not a {key_type} key: {e}")
                            continue
                        except Exception as e:
                            logger.debug(f"Error loading as {key_type}: {e}")
                            continue

                    if not pkey:
                        logger.warning(f"Failed to load SSH key from {ssh_key_path}, will try password")

                except Exception as e:
                    logger.error(f"Error loading SSH key from file: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.info("No SSH key path provided - using password authentication")

            # OPTIMIZED: Enhanced connection parameters with key support
            try:
                ssh_client.connect(
                    hostname=hostname,
                    port=int(port),
                    username=username,
                    password=password,  # ✓ GOOD: Always provide password for fallback
                    pkey=pkey,  # Paramiko tries key first, then password if key fails
                    timeout=15,
                    banner_timeout=15,
                    auth_timeout=15,
                    look_for_keys=False,
                    allow_agent=False,
                    compress=False,
                    gss_auth=False,
                    gss_kex=False
                )

                # Connection successful
                logger.info(f"SSH connection established to {hostname}:{port}")

                if pkey:
                    logger.info(f"✓ SSH key authentication successful for {username}@{hostname}")
                else:
                    logger.info(f"Password authentication successful for {username}@{hostname}")

                # Open channel with optimal settings
                channel = ssh_client.invoke_shell(
                    term='xterm-256color',
                    width=80,
                    height=24
                )

                # Optimize channel settings for game/interactive use
                channel.settimeout(0.1)  # Non-blocking with minimal timeout
                channel.set_combine_stderr(True)

                # Store connection details
                self.clients[window_id] = {
                    'ssh_client': ssh_client,
                    'channel': channel,
                    'websocket': websocket,
                    'connected': True,
                    'hostname': hostname,
                    'username': username
                }

                # Send success message
                await websocket.send_json({
                    'type': 'status',
                    'message': f'Connected to {hostname}:{port} as {username}'
                })

                logger.info(f"Interactive shell opened for {window_id}")

            except paramiko.AuthenticationException as auth_error:
                error_msg = f"SSH Authentication failed: {auth_error}"
                logger.error(error_msg)
                await websocket.send_json({
                    'type': 'error',
                    'message': error_msg
                })
                raise

            except Exception as conn_error:
                error_msg = f"SSH Connection failed: {conn_error}"
                logger.error(error_msg)
                await websocket.send_json({
                    'type': 'error',
                    'message': error_msg
                })
                raise

        except Exception as e:
            logger.error(f"Failed to establish SSH connection for {window_id}: {e}")

            # Send error to terminal
            error_message = f"SSH Authentication failed: {str(e)}"
            logger.info(f"Sending error to terminal: {error_message}")

            try:
                await websocket.send_json({
                    'type': 'error',
                    'message': error_message
                })
            except Exception as send_error:
                logger.error(f"Failed to send error message: {send_error}")

            raise

    async def send_error_to_terminal(self, websocket, window_id, error_message):
        """Send error message to terminal"""
        logger.info(f"Sending error to terminal: {error_message}")

        # Send as terminal output
        formatted_error = f"\r\n[ERROR] {error_message}\r\n"
        encoded_data = base64.b64encode(formatted_error.encode('utf-8')).decode('utf-8')

        try:
            await websocket.send_json({
                'type': 'ssh_output',
                'data': encoded_data,
                'tabId': window_id
            })
            await websocket.send_json({
                'type': 'error',
                'message': error_message
            })
        except Exception as ws_error:
            logger.error(f"Failed to send error via websocket: {ws_error}")

    async def send_input(self, window_id: str, input_data: str):
        """Send input to SSH channel with game optimization"""
        if window_id not in self.clients or not self.clients[window_id]['connected']:
            logger.warning(f"No active SSH connection for window {window_id}")
            return

        channel = self.clients[window_id]['channel']
        if channel and not channel.closed:
            try:
                # OPTIMIZED: Send input immediately without buffering
                channel.send(input_data)

                # Force flush the channel buffer for immediate transmission
                if hasattr(channel, 'flush'):
                    channel.flush()

                logger.debug(f"Sent {len(input_data)} chars to SSH channel {window_id}: {repr(input_data)}")
            except Exception as e:
                logger.error(f"Failed to send input to SSH channel {window_id}: {e}")

    async def resize_terminal(self, window_id: str, cols: int, rows: int):
        """Resize the SSH terminal with game-friendly dimensions"""
        if window_id not in self.clients or not self.clients[window_id]['connected']:
            return

        channel = self.clients[window_id]['channel']
        if channel and not channel.closed:
            try:
                # Ensure minimum dimensions for games
                cols = max(cols, 80)
                rows = max(rows, 24)

                channel.resize_pty(width=cols, height=rows)
                logger.debug(f"Resized SSH terminal {window_id} to {cols}x{rows}")
            except Exception as e:
                logger.error(f"Failed to resize SSH terminal {window_id}: {e}")

    async def disconnect(self, window_id: str):
        """Disconnect SSH client"""
        client_data = self.clients.pop(window_id, None)
        if client_data:
            logger.info(f"Disconnecting SSH client for window {window_id}")

            channel = client_data.get('channel')
            client = client_data.get('client')

            try:
                if channel and not channel.closed:
                    channel.close()
                    logger.info(f"SSH channel closed for {window_id}")
            except Exception as e:
                logger.error(f"Error closing SSH channel {window_id}: {e}")

            try:
                if client:
                    client.close()
                    logger.info(f"SSH client closed for {window_id}")
            except Exception as e:
                logger.error(f"Error closing SSH client {window_id}: {e}")

    async def listen_to_ssh_output(self, window_id: str, websocket):
        """Listen for SSH output optimized for game performance"""
        logger.info(f"Starting game-optimized SSH output listener for {window_id}")

        while window_id in self.clients:
            try:
                client_data = self.clients[window_id]

                if not client_data.get('connected'):
                    logger.debug(f"SSH not connected yet for {window_id}, waiting...")
                    await asyncio.sleep(0.05)  # Reduced sleep for faster connection
                    continue

                channel = client_data.get('channel')
                if not channel or channel.closed:
                    logger.info(f"SSH channel closed for {window_id}")
                    break

                # OPTIMIZED: More aggressive data checking for games
                data_received = False

                if channel.recv_ready():
                    try:
                        # OPTIMIZED: Larger buffer for game data
                        data = channel.recv(16384)  # Increased from 4096
                        if data:
                            logger.debug(f"Received {len(data)} bytes from SSH for {window_id}")

                            # Encode for WebSocket transmission
                            encoded_data = base64.b64encode(data).decode('utf-8')

                            await websocket.send_json({
                                'type': 'ssh_output',
                                'data': encoded_data,
                                'tabId': window_id
                            })

                            data_received = True
                        else:
                            logger.debug(f"Empty data received from SSH for {window_id}")

                    except Exception as e:
                        logger.error(f"Error processing SSH output for {window_id}: {e}")

                # Check for stderr data too (important for some games)
                if channel.recv_stderr_ready():
                    try:
                        stderr_data = channel.recv_stderr(4096)
                        if stderr_data:
                            logger.debug(f"Received {len(stderr_data)} bytes stderr from SSH for {window_id}")

                            encoded_data = base64.b64encode(stderr_data).decode('utf-8')
                            await websocket.send_json({
                                'type': 'ssh_output',
                                'data': encoded_data,
                                'tabId': window_id
                            })

                            data_received = True
                    except Exception as e:
                        logger.error(f"Error processing SSH stderr for {window_id}: {e}")

                # Check if SSH session ended
                if channel.exit_status_ready():
                    exit_status = channel.recv_exit_status()
                    logger.info(f"SSH session {window_id} ended with exit status {exit_status}")

                    await websocket.send_json({
                        'type': 'process_ended',
                        'message': f'SSH session ended (exit code: {exit_status})'
                    })
                    break

                # OPTIMIZED: Dynamic sleep based on data activity
                if data_received:
                    # If we received data, check again quickly for more
                    await asyncio.sleep(0.001)  # 1ms for high responsiveness
                else:
                    # If no data, wait a bit longer but still responsive
                    await asyncio.sleep(0.01)  # 10ms when idle

            except asyncio.CancelledError:
                logger.info(f"SSH output listener cancelled for {window_id}")
                break
            except Exception as e:
                logger.error(f"Error in SSH output listener for {window_id}: {e}")
                await asyncio.sleep(0.05)  # Brief pause before retrying

        logger.info(f"SSH output listener ended for {window_id}")

    def get_active_connections(self) -> Dict[str, Dict]:
        """Get information about active SSH connections"""
        active = {}
        for window_id, client_data in self.clients.items():
            channel = client_data.get('channel')
            client = client_data.get('client')

            active[window_id] = {
                'connected': client_data.get('connected', False),
                'channel_open': channel and not channel.closed if channel else False,
                'client_connected': client and client.get_transport() and client.get_transport().is_active() if client else False
            }
        return active