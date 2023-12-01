import './App.css'
import React, { useEffect, useRef, useState } from 'react';

const App: React.FC = () => {

  // TURN ICE SERVER CONFIG :
  const configurationIceServer = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // BACKEND :
  const serverUrl = 'http://83.113.50.18:3000/'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // STATES :
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  let oneTime = true

  // INITIALIZE :
  useEffect(() => {
    if (oneTime) {
      initializePeerConnection()
      oneTime = false
    }
  }, []);

  // INITIALIZE PEER CONNECTION WITH REMOTE STREAM :
  const initializePeerConnection = async () => {
    // const a = async () => {
    const peerConnection = new RTCPeerConnection(configurationIceServer);
    peerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      console.log("icecandidate EVENT LISTENER");

      if (event.candidate) {
        saveCallerIceCandidate(event.candidate)
        console.log("EVENT_ICE_CANDIDATE", event.candidate);
        try {
          const response = await fetch(serverUrl + "save-caller-candidates", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event.candidate),
          });
          if (!response.ok) {
            throw new Error('Request failed');
          }
          const data: RTCIceCandidate = await response.json();
          console.log("Fetch save caller candidates response : ", data);
        } catch (error) {
          console.error('An error occurred:', error);
          throw error;
        }
        // Send the ICE candidate to the remote peer
        // For simplicity, you can use a signaling server or a WebSocket to exchange ICE candidates
        // Example: socket.emit('candidate', event.candidate.toJSON());
      } else {
        console.log('ICE candidate gathering completed.');
      }
    });
    peerConnection.addEventListener('track', (event: RTCTrackEvent) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });
    if (peerConnection) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("READY TO SEND OFFER : ", offer);
      try {
        const response = await fetch(serverUrl + "save-room-with-offer", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ offer }),
        });
        if (!response.ok) {
          throw new Error('Request failed');
        }
        const data: any = await response.json();
        console.log("Fetch save room with offer response : ", data);
      } catch (error) {
        console.error('An error occurred:', error);
        throw error;
      }
      // Send the offer to the remote peer
      // For simplicity, you can use a signaling server or a WebSocket to exchange session descriptions
      // Example: socket.emit('offer', offer);
    }
    // }
    // a();
    setPeerConnection(peerConnection);
  };

  const saveCallerIceCandidate = async (candidate: RTCIceCandidate) => {

  }

  return (
    <div>
      <div>
        <h2>Remote Video</h2>
        <video ref={remoteVideoRef} autoPlay playsInline muted />
      </div>
    </div>
  );
};

export default App;
