(() => {
  const connection = document.getElementById('connection');
  const feedback = document.getElementById('feedback');
  const colorSelect = document.getElementById('target-color');
  const buttons = [...document.querySelectorAll('[data-preset]')];
  const objectMap = document.getElementById('object-map');
  const objectCount = document.getElementById('object-count');
  const objectDetail = document.getElementById('object-detail');
  const refreshButton = document.getElementById('refresh-objects');
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

  let currentObjects = [];
  let selectedGuid = null;

  function selectObject(object) {
    selectedGuid = object.guid;
    objectDetail.replaceChildren();
    const title = document.createElement('b');
    title.textContent = object.label;
    const line = document.createElement('span');
    line.textContent = ` · ${object.kind} · X ${object.x.toFixed(1)} / Z ${object.z.toFixed(1)} · ${object.locked ? 'locked' : 'unlocked'}`;
    objectDetail.append(title, line);
    objectMap.querySelectorAll('.map-marker').forEach(marker => {
      marker.setAttribute('aria-pressed', String(marker.dataset.guid === selectedGuid));
    });
  }

  function renderObjects(objects) {
    currentObjects = Array.isArray(objects) ? objects : [];
    objectCount.textContent = `${currentObjects.length} public objects · updated from TTS`;
    objectMap.replaceChildren();
    if (!currentObjects.length) {
      const empty = document.createElement('div');
      empty.className = 'map-empty';
      empty.textContent = 'No public tabletop objects were reported. Private hand objects are intentionally omitted.';
      objectMap.append(empty);
      objectDetail.textContent = 'No object selected.';
      return;
    }

    const minX = Math.min(...currentObjects.map(item => item.x));
    const maxX = Math.max(...currentObjects.map(item => item.x));
    const minZ = Math.min(...currentObjects.map(item => item.z));
    const maxZ = Math.max(...currentObjects.map(item => item.z));
    const rangeX = Math.max(maxX - minX, 8);
    const rangeZ = Math.max(maxZ - minZ, 8);
    const pad = 10;

    currentObjects.forEach((object, index) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'map-marker';
      marker.dataset.guid = object.guid;
      marker.dataset.kind = object.kind;
      marker.dataset.locked = String(object.locked);
      marker.style.left = `${pad + ((object.x - minX) / rangeX) * (100 - pad * 2)}%`;
      marker.style.top = `${pad + ((object.z - minZ) / rangeZ) * (100 - pad * 2)}%`;
      marker.textContent = object.kind === 'Card' ? 'C' : object.kind === 'Deck' ? 'D' : String(index + 1);
      marker.title = object.label;
      marker.setAttribute('aria-label', `${object.label}, ${object.kind}`);
      marker.setAttribute('aria-pressed', String(object.guid === selectedGuid));
      marker.addEventListener('click', () => selectObject(object));
      objectMap.append(marker);
    });

    const selected = currentObjects.find(item => item.guid === selectedGuid);
    if (selected) selectObject(selected);
    else objectDetail.textContent = 'Tap a marker to inspect its public name and position.';
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

  socket.on('table_objects_update', data => {
    renderObjects(data?.objects);
  });

  socket.on('table_objects_request_result', result => {
    refreshButton.disabled = false;
    setFeedback(result?.message || 'Object refresh request completed.', result?.ok ? 'success' : 'error');
  });

  refreshButton.addEventListener('click', () => {
    if (!joined) {
      setFeedback('Connect to the companion server before refreshing the object map.', 'error');
      return;
    }
    refreshButton.disabled = true;
    setFeedback('Requesting a fresh scene snapshot from TTS…');
    socket.emit('table_request_objects');
    window.setTimeout(() => {
      if (refreshButton.disabled) {
        refreshButton.disabled = false;
        setFeedback('No refresh response. Check the TTS helper connection.', 'error');
      }
    }, 5000);
  });

  socket.on('disconnect', () => {
    joined = false;
    setConnection('disconnected', 'Disconnected');
    setFeedback('Connection lost. Reconnecting…', 'error');
    setBusy(false);
    refreshButton.disabled = false;
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
