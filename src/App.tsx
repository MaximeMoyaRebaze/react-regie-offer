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
  // const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);


  const remoteStream = new MediaStream()




    // INITIALIZE :
    useEffect(() => {
      const initializeMediaStream = async () => {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
              setLocalStream(stream);
              // if (localVideoRef.current) {
              //     localVideoRef.current.srcObject = stream;
              // }
          } catch (error) {
              console.error('Error accessing webcam:', error);
          }
      };
      initializeMediaStream();
  }, []);

  useEffect(() => {
    
    initializePeerConnection()
    
  
}, [localStream]);



  async function handleStartBroadcast(peerConnection: RTCPeerConnection) {
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

  // INITIALIZE PEER CONNECTION WITH REMOTE STREAM :
  const initializePeerConnection = () => {
    const peerConnection = new RTCPeerConnection(configurationIceServer);

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });

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
    if (localStream) {
      localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
      });
  }

    handleStartBroadcast(peerConnection);



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
