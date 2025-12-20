declare const Peer: any;
import { Theme } from '../types.ts';

export class PeerService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private calls: Map<string, any> = new Map();
  private onConnectionUpdate: (peers: string[]) => void;
  private onStreamReceived: (stream: MediaStream, peerId: string) => void;
  private onStreamEnded: (peerId: string) => void;
  private reconnectTimer: any = null;

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
    const peerId = `cl-${frequency}-${callsign.replace(/\s+/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (!(window as any).Peer) {
      return Promise.reject("PeerJS not loaded");
    }

    this.peer = new (window as any).Peer(peerId, {
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
      
      this.peer.on('disconnected', () => {
        console.warn('Peer disconnected from server. Attempting to reconnect...');
        // Intentar reconectar automáticamente
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });

      this.peer.on('error', (err: any) => {
        console.error('PeerJS error:', err);
        
        // Manejar específicamente el error de pérdida de conexión
        if (err.type === 'server-error' || err.type === 'network' || err.type === 'disconnected') {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
              console.log('Attempting manual recovery of Peer connection...');
              this.peer.reconnect();
            }
          }, 5000);
        }
        
        // No rechazamos si ya estamos inicializados, para permitir reconexión silenciosa
        if (this.peer && !this.peer.open) {
            reject(err);
        }
      });
    });
  }

  private setupListeners() {
    this.peer.on('connection', (conn: any) => {
      this.handleIncomingConnection(conn);
    });

    this.peer.on('call', (call: any) => {
      call.answer();
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

  broadcastVoice(stream: MediaStream) {
    if (!this.peer || this.peer.destroyed || !this.peer.open) return;
    this.connections.forEach((_conn, peerId) => {
      try {
        const call = this.peer.call(peerId, stream);
        if (call) {
          this.calls.set(peerId, call);
        }
      } catch (err) {
        console.error(`Failed to call peer ${peerId}:`, err);
      }
    });
  }

  stopBroadcast() {
    this.calls.forEach((call) => {
      try { call.close(); } catch(e) {}
    });
    this.calls.clear();
  }

  destroy() {
    clearTimeout(this.reconnectTimer);
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections.clear();
    this.calls.clear();
  }
}