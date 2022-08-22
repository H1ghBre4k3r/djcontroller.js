function handleMIDIMessageEvent(event: any) {
  if (!('data' in event)) {
    console.warn('Ignoring MIDI event without data');
    return;
  }
  const [status, data1, data2] = event.data as Uint8Array;
  console.log(`MIDI message: Status: ${status.toString(16)}, data1: ${data1.toString(16)}, data2: ${data2.toString(16)}`);
}

window.addEventListener('load', async () => {
  if (!('requestMIDIAccess' in navigator)) {
    console.warn('Web MIDI is not supported by this browser!');
    return;
  }

  // Request access to MIDI devices
  const midiAccess = await navigator.requestMIDIAccess();

  function registerMIDIListeners() {
    let inputCount = 0;
    midiAccess.inputs.forEach(input => {
      input.addEventListener('midimessage', handleMIDIMessageEvent);
      inputCount++;
    });
    console.log(`${inputCount} MIDI input(s) available`);
  }

  // Register MIDI input listeners
  registerMIDIListeners();
  midiAccess.addEventListener('statechange', () => {
    registerMIDIListeners();
  });
});