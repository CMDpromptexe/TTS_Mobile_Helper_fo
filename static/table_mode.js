(() => {
  const connection = document.getElementById('connection');
  const feedback = document.getElementById('feedback');
  const colorSelect = document.getElementById('target-color');
  const buttons = [...document.querySelectorAll('[data-preset]')];
  const clientKey = 'tts_table_mode_admin_client_id';
  let clientId = localStorage.getItem(clientKey);
  if (!clientId) {
    clientId = 'table-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    localStorage.setItem(clientKey, clientId);
  }

  const socket = io();
  let joined = false;

  function setConnection(state, label) {
    connection.dataset.state = state;
    connection.querySelector('b').textContent = label;
  }

  function setFeedback(message, state = 'info') {
    feedback.textContent = message;
    feedback.dataset.state = state;
  }

  function setBusy(busy) {
    buttons.forEach(button => button.disabled = busy);
  }

  socket.on('connect', () => {
    joined = false;
    setConnection('connecting', 'Joining admin session');
    socket.emit('join', {
      color: 'White',
      client_id: clientId,
      is_admin: true,
      language: 'en'
    });
  });

  socket.on('join_success', () => {
    joined = true;
    setConnection('connected', 'Connected');
    setFeedback('Connected. Waiting for the TTS helper to finish syncing.');
  });

  socket.on('join_error', data => {
    joined = false;
    setConnection('disconnected', 'Join failed');
    setFeedback(data?.error || 'Could not join the companion server.', 'error');
  });

  socket.on('lua_status', status => {
    if (!status?.ready) {
      setFeedback('TTS helper is not ready. Load the Mobile Helper object in your table.', 'error');
    } else {
      setFeedback('TTS helper ready. Choose a player camera and a view.');
    }
  });

  socket.on('table_camera_result', result => {
    setBusy(false);
    if (result?.ok) {
      setFeedback(result.message || 'Camera command sent to TTS.', 'success');
    } else {
      setFeedback(result?.message || 'Camera command failed.', 'error');
    }
  });

  socket.on('disconnect', () => {
    joined = false;
    setConnection('disconnected', 'Disconnected');
    setFeedback('Connection lost. Reconnecting…', 'error');
    setBusy(false);
  });

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      if (!joined) {
        setFeedback('Connect to the companion server before sending camera commands.', 'error');
        return;
      }
      setBusy(true);
      setFeedback('Sending camera command…');
      socket.emit('table_camera', {
        target_color: colorSelect.value,
        preset: button.dataset.preset
      });
      window.setTimeout(() => {
        if (buttons.some(item => item.disabled)) {
          setBusy(false);
          setFeedback('No response from the server. Check the TTS helper connection.', 'error');
        }
      }, 5000);
    });
  });
})();
