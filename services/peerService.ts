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
  private isDestroyed: boolean = false;

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
    this.isDestroyed = false;
    const cleanCallsign = callsign.replace(/[^a-zA-Z0-9]/g, '');
    const peerId = `cl-${frequency}-${cleanCallsign}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (!(window as any).Peer) {
      console.error("CRITICAL: PeerJS script not found in window object.");
      return Promise.reject("PeerJS not loaded");
    }

    if (this.peer) {
      this.peer.destroy();
    }

    console.log("Initializing Peer with ID:", peerId);

    this.peer = new (window as any).Peer(peerId, {
      debug: 1, // Reducido para evitar spam de consola pero mantener visibilidad de errores
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject("Connection timeout - Server unreachable");
      }, 10000);

      this.peer.on('open', (id: string) => {
        clearTimeout(connectionTimeout);
        console.log('Peer node established. ID:', id);
        this.setupListeners();
        resolve(id);
      });
      
      this.peer.on('disconnected', () => {
        if (this.isDestroyed) return;
        console.warn('Signaling server link lost. Attempting auto-reconnect...');
        this.peer.reconnect();
      });

      this.peer.on('error', (err: any) => {
        console.error('PeerJS Operational Error:', err.type, err);
        
        // Manejo específico de pérdida de servidor o red
        if (err.type === 'server-error' || err.type === 'network' || err.type === 'disconnected' || err.type === 'socket-error') {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
              console.log('Force retrying signaling connection...');
              this.peer.reconnect();
            }
          }, 3000);
        }
        
        if (!this.peer.open) {
          clearTimeout(connectionTimeout);
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
      console.log('Receiving uplink from:', call.peer);
      call.answer();
      call.on('stream', (remoteStream: MediaStream) => {
        this.onStreamReceived(remoteStream, call.peer);
      });
      call.on('close', () => {
        this.onStreamEnded(call.peer);
        this.calls.delete(call.peer);
      });
      call.on('error', (err: any) => {
        console.error('Uplink error:', err);
        this.onStreamEnded(call.peer);
        this.calls.delete(call.peer);
      });
      this.calls.set(call.peer, call);
    });
  }

  private handleIncomingConnection(conn: any) {
    conn.on('open', () => {
      console.log('Connection established with peer:', conn.peer);
      this.connections.set(conn.peer, conn);
      this.updatePeerList();
    });
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.updatePeerList();
    });
    conn.on('error', (err: any) => {
      console.error('Data connection error:', err);
      this.connections.delete(conn.peer);
      this.updatePeerList();
    });
  }

  private updatePeerList() {
    this.onConnectionUpdate(Array.from(this.connections.keys()));
  }

  broadcastVoice(stream: MediaStream) {
    if (!this.peer || this.peer.destroyed) return;
    
    // Si estamos desconectados del servidor de señalización, intentar reconexión rápida
    if (this.peer.disconnected) {
      this.peer.reconnect();
    }

    this.connections.forEach((_conn, peerId) => {
      try {
        // Limpiar llamadas previas al mismo ID antes de iniciar nueva transmisión
        if (this.calls.has(peerId)) {
          try { this.calls.get(peerId).close(); } catch(e) {}
        }
        
        const call = this.peer.call(peerId, stream);
        if (call) {
          this.calls.set(peerId, call);
          call.on('error', (err: any) => console.error('Call failure:', err));
        }
      } catch (err) {
        console.error(`Uplink failed for peer ${peerId}:`, err);
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
    this.isDestroyed = true;
    clearTimeout(this.reconnectTimer);
    this.stopBroadcast();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    console.log('Peer service node destroyed.');
  }
}