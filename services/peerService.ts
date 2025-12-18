
declare const Peer: any;

export class PeerService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private calls: Map<string, any> = new Map();
  private onConnectionUpdate: (peers: string[]) => void;
  private onStreamReceived: (stream: MediaStream, peerId: string) => void;
  private onStreamEnded: (peerId: string) => void;

  constructor(
    onConnectionUpdate: (peers: string[]) => void,
    onStreamReceived: (stream: MediaStream, peerId: string) => void,
    onStreamEnded: (peerId: string) => void
  ) {
    this.onConnectionUpdate = onConnectionUpdate;
    this.onStreamReceived = onStreamReceived;
    this.onStreamEnded = onStreamEnded;
  }

  async initialize(frequency: string, callsign: string): Promise<string> {
    const peerId = `cl-${frequency}-${callsign}-${Math.random().toString(36).substring(2, 6)}`;
    
    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    return new Promise((resolve, reject) => {
      this.peer.on('open', (id: string) => {
        this.setupListeners();
        resolve(id);
      });
      this.peer.on('error', (err: any) => reject(err));
    });
  }

  private setupListeners() {
    this.peer.on('connection', (conn: any) => {
      this.handleIncomingConnection(conn);
    });

    this.peer.on('call', (call: any) => {
      call.answer(); // Answer incoming call automatically
      call.on('stream', (remoteStream: MediaStream) => {
        this.onStreamReceived(remoteStream, call.peer);
      });
      call.on('close', () => {
        this.onStreamEnded(call.peer);
      });
      this.calls.set(call.peer, call);
    });
  }

  private handleIncomingConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.updatePeerList();
    });
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.updatePeerList();
    });
    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.updatePeerList();
    });
  }

  private updatePeerList() {
    this.onConnectionUpdate(Array.from(this.connections.keys()));
  }

  async connectToPeer(targetPeerId: string) {
    if (this.connections.has(targetPeerId)) return;
    const conn = this.peer.connect(targetPeerId);
    this.handleIncomingConnection(conn);
  }

  broadcastVoice(stream: MediaStream) {
    this.connections.forEach((_conn, peerId) => {
      const call = this.peer.call(peerId, stream);
      this.calls.set(peerId, call);
    });
  }

  stopBroadcast() {
    this.calls.forEach((call) => call.close());
    this.calls.clear();
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections.clear();
    this.calls.clear();
  }
}
