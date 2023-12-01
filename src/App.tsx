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
  // const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  // INITIALIZE :
  useEffect(() => {
    initializePeerConnection()
  }, []);

  // INITIALIZE PEER CONNECTION WITH REMOTE STREAM :
  const initializePeerConnection = () => {
    const peerConnection = new RTCPeerConnection(configurationIceServer);
    peerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        fetchIceCandidate(event.candidate)
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
    handleStartBroadcast()
    // if (localStream) {
    //   localStream.getTracks().forEach((track) => {
    //     peerConnection.addTrack(track, localStream);
    //   });
    // }
    setPeerConnection(peerConnection);
  };

  const fetchIceCandidate = async (candidate: RTCIceCandidate) => {
    console.log("EVENT_ICE_CANDIDATE", candidate);
    try {
      const response = await fetch(serverUrl + "save-caller-candidates", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidate),
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
  }

  const handleStartBroadcast = async () => {
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
        const data: RTCSessionDescriptionInit = await response.json();
        console.log("Fetch save room with offer response : ", data);
      } catch (error) {
        console.error('An error occurred:', error);
        throw error;
      }
      // Send the offer to the remote peer
      // For simplicity, you can use a signaling server or a WebSocket to exchange session descriptions
      // Example: socket.emit('offer', offer);
    }
  };

  // UPDATE LOCAL STREAM :
  useEffect(() => {
    initializePeerConnection();
  }, [remoteStream]);

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
