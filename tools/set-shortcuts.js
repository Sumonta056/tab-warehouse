(async () => {
  const dp = chrome.developerPrivate;
  const mac = navigator.platform.includes('Mac');
  const want = {
    'quick-save': { set: mac ? 'Command+K' : 'Ctrl+K', shown: mac ? '⌘K' : 'Ctrl+K' },
    palette: { set: mac ? 'Command+Shift+K' : 'Ctrl+Shift+K', shown: mac ? '⇧⌘K' : 'Ctrl+Shift+K' },
  };
  const all = await dp.getExtensionsInfo();
  const tw = all.filter((x) => x.name.startsWith('Tab Warehouse') && x.commands.some((c) => c.name === 'palette'));
  if (!tw.length) return console.log('No Tab Warehouse with the palette command found. Reload the extension first.');
  const shown = Object.values(want).map((w) => w.shown);
  for (const ext of all) {
    for (const c of ext.commands) {
      if (shown.includes(c.keybinding) && !(tw.includes(ext) && want[c.name]?.shown === c.keybinding)) {
        await dp.updateExtensionCommand({ extensionId: ext.id, commandName: c.name, keybinding: '' });
        console.log(`Removed ${c.keybinding} from ${ext.name} › ${c.name}`);
      }
    }
  }
  for (const ext of tw) {
    for (const [name, w] of Object.entries(want)) {
      await dp.updateExtensionCommand({ extensionId: ext.id, commandName: name, keybinding: w.set });
    }
    const now = (await dp.getExtensionInfo(ext.id)).commands;
    console.log(`${ext.prettifiedPath}: ` + now.map((c) => `${c.name} = ${c.keybinding || 'Not set'}`).join(', '));
  }
})().catch((e) => console.error('Could not set the keys:', e.message));
