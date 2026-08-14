import net from "node:net";
import tls from "node:tls";

export type SmtpConfig = {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  from?: string;
};

function readResponse(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const onData = (chunk: Buffer | string) => {
      data += chunk.toString();
      const lines = data.split(/\r?\n/).filter(Boolean);
      if (lines.length && /^\d{3} /.test(lines[lines.length - 1])) {
        cleanup();
        resolve(lines.join("\n"));
      }
    };
    const onError = (e: Error) => { cleanup(); reject(e); };
    const onTimeout = () => { cleanup(); reject(new Error("SMTP timeout")); };
    const cleanup = () => { socket.off("data", onData); socket.off("error", onError); socket.off("timeout", onTimeout); };
    socket.on("data", onData); socket.on("error", onError); socket.setTimeout(15_000, onTimeout);
  });
}

async function command(socket: net.Socket | tls.TLSSocket, line: string) {
  socket.write(`${line}\r\n`);
  return readResponse(socket);
}

function ok(response: string) {
  const code = Number(response.slice(0, 3));
  if (code >= 400) throw new Error(`SMTP ${response.slice(0, 200)}`);
  return code;
}

function upgradeToTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, host, servername: host, rejectUnauthorized: true }, () => resolve(secure));
    secure.once("error", reject);
  });
}

export async function smtpTest(config: SmtpConfig) {
  if (!config.host || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("Invalid SMTP host/port");
  let socket: net.Socket | tls.TLSSocket = net.createConnection({ host: config.host, port: config.port });
  try {
    ok(await readResponse(socket));
    ok(await command(socket, `EHLO servoman.local`));
    const protocol = config.protocol.toLowerCase();
    if (protocol.includes("starttls")) {
      ok(await command(socket, "STARTTLS"));
      socket = await upgradeToTls(socket as net.Socket, config.host);
      ok(await command(socket, "EHLO servoman.local"));
    }
    if (config.username) {
      const auth = Buffer.from(`\0${config.username}\0${config.password || ""}`).toString("base64");
      try { ok(await command(socket, `AUTH PLAIN ${auth}`)); }
      catch {
        ok(await command(socket, "AUTH LOGIN"));
        ok(await command(socket, Buffer.from(config.username).toString("base64")));
        ok(await command(socket, Buffer.from(config.password || "").toString("base64")));
      }
    }
    if (config.from) {
      ok(await command(socket, `MAIL FROM:<${config.from}>`));
      ok(await command(socket, `RCPT TO:<${config.from}>`));
      ok(await command(socket, "RSET"));
    }
    await command(socket, "QUIT");
    return { ok: true, message: `SMTP connection/authentication succeeded for ${config.host}:${config.port}` };
  } finally {
    socket.destroy();
  }
}
