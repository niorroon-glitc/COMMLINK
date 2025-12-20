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
    const cleanCallsign = callsign.replace(/[^a-zA-Z0-9]/g, '');
    const peerId = `cl-${frequency}-${cleanCallsign}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (!(window as any).Peer) {
      return Promise.reject("PeerJS not loaded");
    }

    if (this.peer) {
      this.peer.destroy();
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
        console.log('Peer connected with ID:', id);
        this.setupListeners();
        resolve(id);
      });
      
      this.peer.on('disconnected', () => {
        console.warn('Peer disconnected from signaling server. Attempting reconnect...');
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });

      this.peer.on('error', (err: any) => {
        console.error('PeerJS error:', err.type, err);
        
        if (err.type === 'server-error' || err.type === 'network' || err.type === 'disconnected') {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
              console.log('Retrying Peer connection...');
              this.peer.reconnect();
            }
          }, 5000);
        }
        
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
      console.log('Incoming call from:', call.peer);
      call.answer();
      call.on('stream', (remoteStream: MediaStream) => {
        this.onStreamReceived(remoteStream, call.peer);
      });
      call.on('close', () => {
        this.onStreamEnded(call.peer);
        this.calls.delete(call.peer);
      });
      call.on('error', (err: any) => {
        console.error('Call error:', err);
        this.onStreamEnded(call.peer);
        this.calls.delete(call.peer);
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
    conn.on('error', (err: any) => {
      console.error('Connection error:', err);
      this.connections.delete(conn.peer);
      this.updatePeerList();
    });
  }

  private updatePeerList() {
    this.onConnectionUpdate(Array.from(this.connections.keys()));
  }

  broadcastVoice(stream: MediaStream) {
    if (!this.peer || this.peer.destroyed) {
      console.error('Cannot broadcast: Peer is destroyed');
      return;
    }
    
    if (this.peer.disconnected) {
      this.peer.reconnect();
    }

    this.connections.forEach((_conn, peerId) => {
      try {
        if (this.calls.has(peerId)) {
          this.calls.get(peerId).close();
        }
        
        const call = this.peer.call(peerId, stream);
        if (call) {
          this.calls.set(peerId, call);
          call.on('error', (err: any) => console.error('Broadcast call error:', err));
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
    this.stopBroadcast();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
  }
}