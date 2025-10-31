const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const pino = require('pino');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      console.log('connection closed, reason:', lastDisconnect?.error?.output?.statusCode || lastDisconnect);
    } else if (connection === 'open') {
      console.log('✅ Bot connected');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const messages = m.messages;
      if (!messages || messages.length === 0) return;
      const msg = messages[0];
      if (!msg.message) return;
      if (msg.key && msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

      if (text === '.menu') {
        await sock.sendMessage(from, { text: "Bot Commands:\n.menu - Show this menu\n!all - Mention everyone" });
        return;
      }

      if (text.startsWith('!all')) {
        if (!from.endsWith('@g.us')) {
          await sock.sendMessage(from, { text: 'এই কমান্ডটি group এ ব্যবহার করো.' });
          return;
        }
        const meta = await sock.groupMetadata(from);
        const participants = meta.participants.map(p => p.id);
        const mentionText = text.length > 4 ? text.slice(4).trim() : 'Attention everyone!';
        await sock.sendMessage(from, { text: mentionText, mentions: participants });
        return;
      }

      if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
        await sock.sendMessage(from, { text: `Hi! ami bot. .menu diye dekho` });
      }

    } catch (err) {
      console.error('message handler error', err);
    }
  });
}

start().catch(err => console.error(err));
