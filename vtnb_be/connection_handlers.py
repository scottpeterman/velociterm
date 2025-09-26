#!/usr/bin/env python3
"""
VelociTerm Backend - Hybrid Connection Handlers
Keeps SessionManager for login compatibility but simplifies WebSocket authentication
"""

import asyncio
import base64
import json
import os
import signal
import logging
import time
import secrets
import yaml
from typing import Dict, Optional, Set
from pathlib import Path
from urllib.parse import parse_qs

from fastapi import WebSocket, WebSocketDisconnect
import pexpect

from models import *
from workspace_manager import WorkspaceManager
from ssh_manager import SSHClientManager

logger = logging.getLogger(__name__)


class SimpleWindowTracker:
    """Simplified window tracking without session authentication"""

    def __init__(self):
        # window_id -> window_info
        self.active_windows: Dict[str, dict] = {}

    def register_window(self, window_id: str, client_ip: str, user_agent: str = None):
        """Register window with basic client info for security"""
        self.active_windows[window_id] = {
            'window_id': window_id,
            'client_ip': client_ip,
            'user_agent': user_agent or '',
            'created_at': time.time(),
            'last_activity': time.time()
        }
        logger.info(f"Registered window {window_id} for client {client_ip}")
        return True

    def validate_access(self, window_id: str, client_ip: str) -> bool:
        """Validate window access - same IP address"""
        if window_id not in self.active_windows:
            logger.warning(f"Window {window_id} not found")
            return False

        window = self.active_windows[window_id]

        # Basic security: same IP address
        if window['client_ip'] != client_ip:
            logger.warning(f"IP mismatch for window {window_id}: {window['client_ip']} vs {client_ip}")
            return False

        # Update activity timestamp
        window['last_activity'] = time.time()
        return True

    def cleanup_window(self, window_id: str):
        """Remove window from tracking"""
        if window_id in self.active_windows:
            del self.active_windows[window_id]
            logger.info(f"Cleaned up window {window_id}")

    def cleanup_stale_windows(self, max_age_hours: int = 24):
        """Clean up windows older than max_age_hours"""
        cutoff_time = time.time() - (max_age_hours * 3600)
        stale_windows = [
            wid for wid, info in self.active_windows.items()
            if info['last_activity'] < cutoff_time
        ]

        for window_id in stale_windows:
            self.cleanup_window(window_id)

        if stale_windows:
            logger.info(f"Cleaned up {len(stale_windows)} stale windows")


class WindowRegistry:
    """Secure window ownership registry - kept for compatibility"""

    def __init__(self):
        # session_id -> set of window_ids
        self.session_windows: Dict[str, Set[str]] = {}
        # window_id -> session_id
        self.window_owners: Dict[str, str] = {}

    def register_window(self, session_id: str, window_id: str) -> bool:
        """Register a window for a session"""
        # Remove from previous owner if exists
        if window_id in self.window_owners:
            old_session = self.window_owners[window_id]
            if old_session in self.session_windows:
                self.session_windows[old_session].discard(window_id)

        # Register with new session
        if session_id not in self.session_windows:
            self.session_windows[session_id] = set()

        self.session_windows[session_id].add(window_id)
        self.window_owners[window_id] = session_id

        logger.info(f"Registered window {window_id} for session {session_id}")
        return True

    def validate_window_access(self, session_id: str, window_id: str) -> bool:
        """Validate that session owns the window"""
        return self.window_owners.get(window_id) == session_id

    def cleanup_session(self, session_id: str):
        """Clean up all windows for a session"""
        if session_id in self.session_windows:
            windows = self.session_windows[session_id].copy()
            for window_id in windows:
                self.window_owners.pop(window_id, None)
            del self.session_windows[session_id]
            logger.info(f"Cleaned up {len(windows)} windows for session {session_id}")


class SessionManager:
    """Session management - kept for login compatibility"""

    def __init__(self):
        self.active_sessions: Dict[str, SessionInfo] = {}
        self.window_registry = WindowRegistry()

    def create_session(self, username: str) -> str:
        """Create a new session for a user"""
        session_id = secrets.token_urlsafe(32)
        self.active_sessions[session_id] = SessionInfo(
            username=username,
            created_at=time.time(),
            last_activity=time.time(),
            session_id=session_id
        )
        logger.info(f"Created session {session_id} for user {username}")
        return session_id

    def get_session_info(self, session_id: str) -> Optional[SessionInfo]:
        """Get session info and update activity"""
        if not session_id or session_id not in self.active_sessions:
            return None

        session = self.active_sessions[session_id]

        # Session timeout (1 hour)
        if time.time() - session.last_activity > 3600:
            self.invalidate_session(session_id)
            return None

        # Update activity
        session.last_activity = time.time()
        return session

    def get_session_user(self, session_id: str) -> Optional[str]:
        """Get username from session ID"""
        session = self.get_session_info(session_id)
        return session.username if session else None

    def invalidate_session(self, session_id: str):
        """Remove a session and cleanup windows"""
        if session_id in self.active_sessions:
            self.window_registry.cleanup_session(session_id)
            del self.active_sessions[session_id]
            logger.info(f"Invalidated session {session_id}")


class ConnectionHandlers:
    """Hybrid WebSocket connection handlers - keeps session manager but simplifies WebSocket auth"""

    def __init__(self, workspace_manager: WorkspaceManager):
        self.workspace_manager = workspace_manager
        self.session_manager = SessionManager()  # Keep for login compatibility
        self.window_tracker = SimpleWindowTracker()  # Use for WebSocket connections
        self.ssh_manager = SSHClientManager()
        self.tui_processes: Dict[str, any] = {}
        self._cleanup_task = None

    def start_background_tasks(self):
        """Start background tasks - call this after the event loop is running"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def _periodic_cleanup(self):
        """Periodically clean up stale windows"""
        while True:
            try:
                await asyncio.sleep(3600)  # Every hour
                self.window_tracker.cleanup_stale_windows()
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")

    def get_client_ip(self, websocket: WebSocket) -> str:
        """Extract client IP from WebSocket"""
        # Try X-Forwarded-For header first (proxy support)
        forwarded_for = websocket.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()

        # Fall back to direct client
        return websocket.client.host if websocket.client else "unknown"

    # In connection_handlers.py, replace the websocket_terminal method
    async def websocket_terminal(self, websocket: WebSocket, window_id: str):
        """Handle SSH terminal WebSocket connections - optimized for games"""

        client_ip = self.get_client_ip(websocket)
        user_agent = websocket.headers.get("user-agent", "")

        # Register window with simple tracking
        self.window_tracker.register_window(window_id, client_ip, user_agent)

        # OPTIMIZED: Set WebSocket options for games
        websocket._ping_interval = 20  # More frequent pings
        websocket._ping_timeout = 10

        await websocket.accept()
        logger.info(f"Game-optimized Terminal WebSocket connected: {window_id} from {client_ip}")

        # Create SSH client
        await self.ssh_manager.create_client(window_id)

        # Start output listener task with higher priority
        listen_task = asyncio.create_task(
            self.ssh_manager.listen_to_ssh_output(window_id, websocket)
        )

        # OPTIMIZED: Set task priority if possible
        try:
            listen_task.set_name(f"ssh_output_{window_id}")
        except AttributeError:
            pass  # Not all Python versions support set_name

        try:
            while True:
                data = await websocket.receive_json()

                # Validate access on each message
                if not self.window_tracker.validate_access(window_id, client_ip):
                    logger.warning(f"Access denied for window {window_id} from {client_ip}")
                    await websocket.close(code=1008, reason="Access denied")
                    break

                if data.get('type') == 'connect':
                    # Start SSH connection using SSH manager
                    await self.ssh_manager.connect(
                        window_id,
                        data.get('hostname'),
                        data.get('port', 22),
                        data.get('username'),
                        data.get('password'),
                        websocket
                    )

                elif data.get('type') == 'input':
                    # OPTIMIZED: Send input immediately for games
                    await self.ssh_manager.send_input(window_id, data.get('data', ''))

                elif data.get('type') == 'resize':
                    # Resize terminal with game-friendly constraints
                    await self.ssh_manager.resize_terminal(
                        window_id,
                        max(data.get('cols', 80), 80),  # Minimum 80 cols
                        max(data.get('rows', 24), 24)  # Minimum 24 rows
                    )

        except WebSocketDisconnect:
            logger.info(f"Terminal WebSocket disconnected: {window_id}")
        except Exception as e:
            logger.error(f"Terminal WebSocket error for {window_id}: {e}")
        finally:
            # Cleanup (same as before)
            listen_task.cancel()
            try:
                await listen_task
            except asyncio.CancelledError:
                pass

            await self.ssh_manager.disconnect(window_id)
            self.window_tracker.cleanup_window(window_id)


    async def websocket_tui(self, websocket: WebSocket, window_id: str):
        """Handle TUI tool WebSocket connections - simplified auth"""

        client_ip = self.get_client_ip(websocket)
        user_agent = websocket.headers.get("user-agent", "")

        # Register window with simple tracking
        self.window_tracker.register_window(window_id, client_ip, user_agent)

        await websocket.accept()
        logger.info(f"TUI WebSocket connected: {window_id} from {client_ip}")

        child = None
        output_task = None

        try:
            # Get tool configuration
            data = await websocket.receive_json()

            # Validate access
            if not self.window_tracker.validate_access(window_id, client_ip):
                await websocket.close(code=1008, reason="Access denied")
                return

            if data.get('type') == 'configure':
                config = data.get('config', {})
                tool_type = config.get('tool', 'htop')
            else:
                tool_type = data.get('tool', 'htop')
                config = data

            # Build command based on tool type
            cmd = self._build_tool_command(tool_type, config)

            if not cmd:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Unknown tool: {tool_type}'
                })
                return

            logger.info(f"Starting TUI tool {tool_type} for {window_id}: {' '.join(cmd)}")

            # Enhanced environment for TUI applications
            env = os.environ.copy()
            env.update({
                'TERM': 'xterm-256color',
                'COLORTERM': 'truecolor',
                'PATH': env.get('PATH', '') + ':.',
            })

            # Remove conflicting terminal variables
            for var in ['TMUX', 'TMUX_PANE', 'STY']:
                env.pop(var, None)

            try:
                # Start process with proper encoding
                child = pexpect.spawn(
                    cmd[0],
                    args=cmd[1:] if len(cmd) > 1 else [],
                    dimensions=(24, 80),
                    env=env,
                    encoding='utf-8',
                    codec_errors='replace',
                    timeout=None
                )

                logger.info(f"TUI process started for {window_id} with PID: {child.pid}")

                # Store process reference
                self.tui_processes[window_id] = {
                    'process': child,
                    'tool': tool_type
                }

                # Start output reading
                output_task = asyncio.create_task(
                    self._read_tui_output_fixed(child, websocket, window_id)
                )

                await websocket.send_json({
                    'type': 'status',
                    'message': f'Started {tool_type}',
                    'pid': child.pid
                })

                # Handle input from WebSocket
                while True:
                    try:
                        data = await websocket.receive_json()

                        # Validate access on each message
                        if not self.window_tracker.validate_access(window_id, client_ip):
                            break

                        if data['type'] == 'input':
                            input_data = data['data']
                            child.send(input_data)

                        elif data['type'] == 'resize':
                            rows = data['rows']
                            cols = data['cols']
                            child.setwinsize(rows, cols)

                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        logger.error(f"Error handling TUI WebSocket message for {window_id}: {e}")
                        break

            except Exception as e:
                logger.error(f"Failed to start TUI process for {window_id}: {e}")
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Failed to start process: {str(e)}'
                })
                return

        except WebSocketDisconnect:
            logger.info(f"TUI WebSocket disconnected: {window_id}")
        except Exception as e:
            logger.error(f"TUI WebSocket error for {window_id}: {e}")
        finally:
            # Cleanup
            if window_id in self.tui_processes:
                del self.tui_processes[window_id]

            if child and child.isalive():
                try:
                    child.terminate(force=False)
                    child.wait()
                except:
                    try:
                        child.kill(signal.SIGKILL)
                    except:
                        pass

            if output_task and not output_task.done():
                output_task.cancel()
                try:
                    await output_task
                except asyncio.CancelledError:
                    pass

            self.window_tracker.cleanup_window(window_id)

    async def websocket_ansible(self, websocket: WebSocket, window_id: str):
        """Handle Ansible execution WebSocket connections - simplified auth"""

        client_ip = self.get_client_ip(websocket)
        user_agent = websocket.headers.get("user-agent", "")

        # Register window with simple tracking
        self.window_tracker.register_window(window_id, client_ip, user_agent)

        await websocket.accept()
        logger.info(f"Ansible WebSocket connected: {window_id} from {client_ip}")

        child = None
        output_task = None

        try:
            while True:
                data = await websocket.receive_json()

                # Validate access on each message
                if not self.window_tracker.validate_access(window_id, client_ip):
                    await websocket.close(code=1008, reason="Access denied")
                    break

                if data.get('type') == 'run_ansible':
                    config = data.get('config', {})

                    try:
                        # Validate configuration
                        credentials = config.get('credentials', {})
                        operation = config.get('operation', {})
                        devices = config.get('devices', [])

                        if not credentials.get('username') or not credentials.get('password'):
                            await websocket.send_json({
                                'type': 'error',
                                'message': 'Username and password are required'
                            })
                            continue

                        if not devices:
                            await websocket.send_json({
                                'type': 'error',
                                'message': 'No devices enabled for execution'
                            })
                            continue

                        # Generate inventory
                        inventory_content = self._generate_ansible_inventory(credentials, devices)

                        # Create temporary inventory file
                        temp_dir = Path("./temp_ansible")
                        temp_dir.mkdir(exist_ok=True)
                        inventory_file = temp_dir / f"inventory_{window_id}.yml"

                        with open(inventory_file, 'w') as f:
                            f.write(inventory_content)

                        # Determine playbook file
                        playbook_file = self._get_ansible_playbook_file(operation)

                        if not playbook_file or not playbook_file.exists():
                            await websocket.send_json({
                                'type': 'error',
                                'message': f'Playbook not found for operation: {operation.get("type")}'
                            })
                            continue

                        # Build ansible-playbook command
                        cmd = [
                            "ansible-playbook",
                            "-i", str(inventory_file),
                            str(playbook_file),
                            "-e", f"output_directory={operation.get('outputDir', './backups')}"
                        ]

                        # Enhanced environment
                        env = os.environ.copy()
                        env.update({
                            'ANSIBLE_USER': credentials.get('username', ''),
                            'ANSIBLE_PASSWORD': credentials.get('password', ''),
                            'ANSIBLE_BECOME_PASSWORD': credentials.get('enablePassword') or credentials.get('password',
                                                                                                            ''),
                            'ANSIBLE_HOST_KEY_CHECKING': 'False',
                            'ANSIBLE_SSH_RETRIES': '3',
                            'ANSIBLE_TIMEOUT': '30'
                        })

                        # Start ansible-playbook process with pexpect
                        child = pexpect.spawn(
                            cmd[0],
                            args=cmd[1:],
                            env=env,
                            encoding='utf-8',
                            codec_errors='replace',
                            timeout=None
                        )

                        # Store process reference
                        self.tui_processes[f"ansible_{window_id}"] = {
                            'process': child,
                            'tool': 'ansible_web_runner'
                        }

                        # Start output reading task with enhanced formatting
                        output_task = asyncio.create_task(
                            self._read_ansible_output(child, websocket, window_id)
                        )

                        await websocket.send_json({
                            'type': 'status',
                            'message': f'Started Ansible playbook: {playbook_file.name}',
                            'pid': child.pid
                        })

                    except Exception as e:
                        await websocket.send_json({
                            'type': 'error',
                            'message': f'Configuration error: {str(e)}'
                        })
                        continue

        except WebSocketDisconnect:
            logger.info(f"Ansible WebSocket disconnected: {window_id}")
        except Exception as e:
            logger.error(f"Ansible WebSocket error for {window_id}: {e}")
        finally:
            # Cleanup
            if f"ansible_{window_id}" in self.tui_processes:
                del self.tui_processes[f"ansible_{window_id}"]

            if child and child.isalive():
                try:
                    child.terminate(force=False)
                    child.wait()
                except:
                    try:
                        child.kill(signal.SIGKILL)
                    except:
                        pass

            if output_task and not output_task.done():
                output_task.cancel()
                try:
                    await output_task
                except asyncio.CancelledError:
                    pass

            self.window_tracker.cleanup_window(window_id)

    # Helper methods remain the same as original
    async def _read_tui_output_fixed(self, child, websocket: WebSocket, window_id: str):
        """Fixed TUI output reading"""
        while child.isalive():
            try:
                # Read with pexpect handling UTF-8
                data = child.read_nonblocking(size=1024, timeout=0.01)

                if data:
                    # Convert string back to bytes then base64
                    data_bytes = data.encode('utf-8', errors='replace')
                    encoded_data = base64.b64encode(data_bytes).decode('ascii')

                    await websocket.send_json({
                        'type': 'tui_output',
                        'data': encoded_data
                    })

            except pexpect.TIMEOUT:
                await asyncio.sleep(0.01)
                continue
            except pexpect.EOF:
                break
            except Exception as e:
                logger.error(f"TUI output read error for {window_id}: {e}")
                break

        # Process ended
        exit_code = child.exitstatus if child.exitstatus is not None else child.signalstatus
        try:
            await websocket.send_json({
                'type': 'process_ended',
                'code': exit_code or 0
            })
        except:
            pass

    async def _read_ansible_output(self, child, websocket: WebSocket, window_id: str):
        """Read Ansible output with enhanced formatting"""
        while child.isalive():
            try:
                output = child.read_nonblocking(size=1024, timeout=0.1)

                if output:
                    # Format each line with Ansible-specific styling
                    formatted_output = self._format_ansible_output(output)

                    # Convert to bytes for base64 encoding
                    output_bytes = formatted_output.encode('utf-8', errors='replace')
                    encoded_data = base64.b64encode(output_bytes).decode('ascii')

                    await websocket.send_json({
                        'type': 'ansible_output',
                        'data': encoded_data
                    })

            except pexpect.TIMEOUT:
                await asyncio.sleep(0.01)
                continue
            except pexpect.EOF:
                logger.info(f"Ansible process ended for {window_id}")
                break
            except Exception as e:
                logger.error(f"Ansible output read error for {window_id}: {e}")
                break

        # Process ended
        exit_code = child.exitstatus if child.exitstatus is not None else child.signalstatus
        success = exit_code == 0 if exit_code is not None else True

        try:
            await websocket.send_json({
                'type': 'execution_complete',
                'success': success,
                'exit_code': exit_code or 0
            })
        except:
            pass

    def _build_tool_command(self, tool_type: str, config: dict) -> list:
        """Build command for TUI tool based on type and config"""
        if tool_type == 'htop':
            return ['htop']
        elif tool_type == 'ping':
            host = config.get('host', '8.8.8.8')
            count = config.get('count', 'continuous')
            if count == 'continuous':
                return ['ping', host]
            else:
                return ['ping', '-c', str(count), host]
        elif tool_type == 'traceroute':
            host = config.get('host', '8.8.8.8')
            return ['traceroute', host]
        elif tool_type == 'go_scan_tui':
            cmd = ['./go-scan-tui']
            if config.get('target'):
                cmd.extend(['--target', config['target']])
            return cmd
        elif tool_type == 'snmp_scanner':
            return ['./snmp_scanner']
        elif tool_type == 'network_tui_python':
            script_path = './network_tui.py'
            python_path = 'python'
            return [python_path, script_path]
        elif tool_type == 'nmap':
            target = config.get('target', '192.168.1.0/24')
            scan_type = config.get('scan_type', '-sn')
            return ['nmap', scan_type, target]
        elif tool_type == 'system_dashboard':
            return ['python', './system_dashboard.py']
        else:
            return None

    def _generate_ansible_inventory(self, credentials: dict, devices: list) -> str:
        """Generate Ansible inventory content from device configuration"""
        inventory = {
            "all": {
                "vars": {
                    "ansible_user": credentials.get('username'),
                    "ansible_password": credentials.get('password'),
                    "ansible_become_password": credentials.get('enablePassword') or credentials.get('password'),
                    "ansible_connection": "network_cli",
                    "ansible_ssh_common_args": "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30",
                    "ansible_host_key_checking": False,
                    "ansible_ssh_retries": 3
                },
                "children": {
                    "cisco_devices": {"hosts": {}},
                    "arista_devices": {"hosts": {}},
                    "linux_devices": {"hosts": {}}
                }
            }
        }

        # Add devices to appropriate groups
        for device in devices:
            if not device.get('enabled', True):
                continue

            device_name = device['name']
            device_type = device['type']
            group_name = self._get_device_group(device_type)

            inventory["all"]["children"][group_name]["hosts"][device_name] = {
                "ansible_host": device['host'],
                "ansible_port": int(device['port']),
                "ansible_network_os": self._get_ansible_network_os(device_type)
            }

        return yaml.dump(inventory, default_flow_style=False)

    def _get_ansible_playbook_file(self, operation: dict) -> Path:
        """Get the playbook file path for the given operation"""
        playbook_dir = Path("./playbooks")
        operation_type = operation.get('type', 'backup')

        if operation_type == 'custom':
            custom_path = operation.get('customPlaybook')
            if custom_path:
                return Path(custom_path).resolve()
            return None

        # Map operation types to playbook files
        playbook_mapping = {
            "backup": "backup_config.yml",
            "facts": "gather_facts.yml",
            "interface_status": "interface_status.yml",
            "health_check": "health_check.yml"
        }

        filename = playbook_mapping.get(operation_type)
        if filename:
            playbook_path = playbook_dir / filename
            if playbook_path.exists():
                return playbook_path.resolve()

        return None

    def _get_device_group(self, device_type: str) -> str:
        """Map device type to inventory group"""
        mapping = {
            "cisco_ios": "cisco_devices",
            "cisco_ios_xe": "cisco_devices",
            "arista_eos": "arista_devices",
            "linux": "linux_devices"
        }
        return mapping.get(device_type, "cisco_devices")

    def _get_ansible_network_os(self, device_type: str) -> str:
        """Map device type to Ansible network OS"""
        mapping = {
            "cisco_ios": "cisco.ios.ios",
            "cisco_ios_xe": "cisco.ios.ios",
            "arista_eos": "arista.eos.eos",
            "linux": "linux"
        }
        return mapping.get(device_type, "cisco.ios.ios")

    def _format_ansible_output(self, line: str) -> str:
        """Format Ansible output with JSON parsing and color coding"""
        line = line.strip()

        # Try to parse JSON lines for better formatting
        if line.startswith('{"') and line.endswith('}'):
            try:
                data = json.loads(line)
                return self._format_json_ansible_data(data)
            except json.JSONDecodeError:
                pass  # Fall through to regular formatting

        # Regular text formatting
        if line.startswith("TASK ["):
            return f"\x1b[36m🔹 {line}\x1b[0m"
        elif line.startswith("PLAY ["):
            return f"\x1b[35m🎭 {line}\x1b[0m"
        elif "ok:" in line or "SUCCESS" in line:
            return f"\x1b[32m✅ {line}\x1b[0m"
        elif "changed:" in line or "CHANGED" in line:
            return f"\x1b[33m🔄 {line}\x1b[0m"
        elif "failed:" in line or "FAILED" in line or "ERROR" in line:
            return f"\x1b[31m❌ {line}\x1b[0m"
        elif "skipping:" in line or "SKIPPED" in line:
            return f"\x1b[90m⏭️ {line}\x1b[0m"
        elif "PLAY RECAP" in line:
            return f"\x1b[36m📊 {line}\x1b[0m"
        elif "FATAL" in line:
            return f"\x1b[31m💥 {line}\x1b[0m"
        elif "WARNING" in line or "WARN" in line:
            return f"\x1b[33m⚠️ {line}\x1b[0m"
        elif line.startswith("ESTABLISH") or line.startswith("SSH:"):
            return f"\x1b[90m🔧 {line}\x1b[0m"
        else:
            return line

    def _format_json_ansible_data(self, data: dict) -> str:
        """Format parsed JSON data from Ansible into readable output"""

        # Handle task results
        if 'changed' in data and 'invocation' in data:
            host = data.get('_ansible_host', 'unknown')
            changed = data.get('changed', False)
            failed = data.get('failed', False)

            # Status indicator
            if failed:
                status = "\x1b[31m❌ FAILED\x1b[0m"
            elif changed:
                status = "\x1b[33m🔄 CHANGED\x1b[0m"
            else:
                status = "\x1b[32m✅ OK\x1b[0m"

            result = f"{status} [{host}]"

            # Add message if present
            if 'msg' in data:
                result += f" - {data['msg']}"

            # Add file info for file operations
            if 'path' in data:
                result += f" | Path: {data['path']}"
            if 'size' in data:
                result += f" | Size: {data['size']} bytes"
            if 'mode' in data:
                result += f" | Mode: {data['mode']}"

            return result

        # Handle ansible_facts (device information)
        elif 'ansible_facts' in data:
            facts = data['ansible_facts']
            host = facts.get('ansible_net_hostname', 'unknown')

            result = f"\x1b[36m📋 Device Facts [{host}]\x1b[0m\n"

            # Key device information
            if 'ansible_net_version' in facts:
                result += f"   Version: {facts['ansible_net_version']}\n"
            if 'ansible_net_model' in facts:
                result += f"   Model: {facts['ansible_net_model']}\n"
            if 'ansible_net_serialnum' in facts:
                result += f"   Serial: {facts['ansible_net_serialnum']}\n"
            if 'ansible_net_iostype' in facts:
                result += f"   OS Type: {facts['ansible_net_iostype']}\n"
            if 'ansible_net_memfree_mb' in facts:
                result += f"   Memory Free: {facts['ansible_net_memfree_mb']} MB\n"
            if 'ansible_net_memtotal_mb' in facts:
                result += f"   Memory Total: {facts['ansible_net_memtotal_mb']} MB\n"

            # Interface count
            if 'ansible_net_interfaces' in facts:
                iface_count = len(facts['ansible_net_interfaces'])
                result += f"   Interfaces: {iface_count}\n"

            return result.rstrip()

        # Handle other cases
        elif 'msg' in data:
            host = data.get('_ansible_host', 'unknown')
            msg = data.get('msg', '')
            return f"\x1b[34m💬 [{host}] {msg}\x1b[0m"

        # Fallback
        else:
            keys = list(data.keys())[:3]
            return f"\x1b[90m📄 JSON: {', '.join(keys)}...\x1b[0m"