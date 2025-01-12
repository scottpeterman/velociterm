document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - with null checks
    const settingsModal = document.getElementById('settingsModal');
    const openSettingsBtn = document.getElementById('open-settings');
    const settingsForm = document.getElementById('settings-form');
    const validateYamlBtn = document.getElementById('validate-yaml');
    const themeSelect = document.getElementById('theme-select');
    const sessionYaml = document.getElementById('session-yaml');
    const useSystemRadio = document.getElementById('use-system');
    const usePersonalRadio = document.getElementById('use-personal');

    // Check if all required elements exist
    if (!settingsModal || !openSettingsBtn || !settingsForm ||
        !validateYamlBtn || !themeSelect || !sessionYaml ||
        !useSystemRadio || !usePersonalRadio) {
        console.error('Required elements not found in the DOM');
        return;
    }

    const closeButton = settingsModal.querySelector('.close-button');
    if (!closeButton) {
        console.error('Close button not found in settings modal');
        return;
    }

    // Error handling utility
    const handleError = (message, error) => {
        console.error(message, error);
        alert(`${message}: ${error.message || 'Unknown error occurred'}`);
    };

async function loadUserSettings() {
    try {
        // Fetch current user settings
        const response = await fetch('/workspace/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');

        const settings = await response.json();

        // Update theme select
        if (settings.theme) {
            themeSelect.value = settings.theme;
        }

        // Update session source selection
        if (settings.sessions?.use_system_file !== undefined) {
            useSystemRadio.checked = settings.sessions.use_system_file;
            usePersonalRadio.checked = !settings.sessions.use_system_file;
            sessionYaml.disabled = settings.sessions.use_system_file;
            sessionYaml.classList.toggle('opacity-50', settings.sessions.use_system_file);
        }

        // Load the appropriate sessions file content
        try {
            const filePath = settings.sessions?.use_system_file ?
                '/sessions/sessions.yaml' :
                `/workspace/${settings.sessions?.personal_file || 'sessions.yaml'}`;

            const sessionsResponse = await fetch(filePath);
            if (sessionsResponse.ok) {
                const content = await sessionsResponse.json(); // Assuming it returns JSON
                // Convert JSON to YAML using js-yaml
                const yamlContent = jsyaml.dump(content, {
                    indent: 2,
                    lineWidth: -1, // No line wrapping
                    noRefs: true
                });
                sessionYaml.value = yamlContent;
            } else {
                // Template in YAML format
                const defaultContent = [
                    {
                        folder_name: "0 - linux",
                        sessions: [
                            {
                                DeviceType: "linux",
                                Model: "Thinkstation P3",
                                SerialNumber: "",
                                SoftwareVersion: "",
                                Vendor: "Lenovo",
                                display_name: "T1000",
                                host: "10.0.0.108",
                                port: "22"
                            }
                        ]
                    }
                ];
                sessionYaml.value = jsyaml.dump(defaultContent, {
                    indent: 2,
                    lineWidth: -1,
                    noRefs: true
                });
            }
        } catch (error) {
            console.error('Error loading sessions file:', error);
            sessionYaml.value = '# Error loading sessions file';
        }
    } catch (error) {
        handleError('Failed to load settings', error);
    }
}
//loadUserSettings
    // Validate YAML content
    async function validateYAML(content) {
        try {
            // First try to parse the YAML locally
            const parsed = jsyaml.load(content);
            if (!parsed) {
                alert('Invalid YAML: Empty or invalid content');
                return false;
            }

            // Validate structure
            if (!Array.isArray(parsed)) {
                alert('Invalid YAML: Root must be a list');
                return false;
            }

            for (const folder of parsed) {
                if (!folder.folder_name || !Array.isArray(folder.sessions)) {
                    alert('Invalid YAML: Each folder must have a folder_name and sessions array');
                    return false;
                }
            }

            // Then validate on the server
            const response = await fetch('/workspace/validate-yaml', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Validation request failed');

            const result = await response.json();
            if (result.valid) {
                alert('YAML validation successful!');
                return true;
            } else {
                alert(`YAML Error: ${result.error}`);
                return false;
            }
        } catch (error) {
            handleError('YAML validation failed', error);
            return false;
        }
    }

    // Save settings
    async function saveSettings(theme, yamlContent) {
        try {
            const useSystemFile = useSystemRadio.checked;

            // Save user settings
            await fetch('/workspace/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    theme: theme,
                    sessions: {
                        use_system_file: useSystemFile,
                        personal_file: 'sessions.yaml'
                    }
                })
            });

            // Only save sessions if using personal file
            if (!useSystemFile) {
                const sessionConfig = jsyaml.load(yamlContent);
                await fetch('/workspace/settings/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sessionConfig)
                });
            }

            alert('Settings saved successfully!');
            window.location.reload();
        } catch (error) {
            handleError('Failed to save settings', error);
        }
    }

    // Radio button event listeners
    useSystemRadio.addEventListener('change', function() {
        sessionYaml.disabled = this.checked;
        sessionYaml.classList.toggle('opacity-50', this.checked);
    });

    usePersonalRadio.addEventListener('change', function() {
        sessionYaml.disabled = false;
        sessionYaml.classList.remove('opacity-50');
    });

    // Main event listeners
    openSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        loadUserSettings();
    });

    closeButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    validateYamlBtn.addEventListener('click', async () => {
        await validateYAML(sessionYaml.value);
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate YAML before saving
        const isValid = await validateYAML(sessionYaml.value);
        if (!isValid) return;

        await saveSettings(themeSelect.value, sessionYaml.value);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
});