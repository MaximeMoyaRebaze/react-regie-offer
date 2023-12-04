import './App.css'
import React, { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

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
  const serverUrlSocket = 'http://83.113.50.18:3001/'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);





  const remoteStream = new MediaStream()

  // INITIALIZE 1 :
  useEffect(() => {

    const socket = io(serverUrlSocket);
    socket.on('connect', () => {
      console.log('SOCKET CONNECTED');
    });

    console.log("INITIALIZE 1");
    const initializeMediaStream = async (socket: Socket) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        initializePeerConnection(stream, socket)
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };
    initializeMediaStream(socket);

  }, []);

  async function handleStartBroadcast(peerConnection: RTCPeerConnection, socket: Socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log("READY TO SEND OFFER : ", offer);

    // Send the offer to the remote peer
    // For simplicity, you can use a signaling server or a WebSocket to exchange session descriptions
    // Example: socket.emit('offer', offer);
    socket.emit('save room with offer', { offer })



  }

  // INITIALIZE PEER CONNECTION WITH REMOTE STREAM :
  const initializePeerConnection = (localStream: MediaStream, socket: Socket) => {
    const peerConnection = new RTCPeerConnection(configurationIceServer);

    socket.on('send room with answer', async (data: any) => {
      console.log("SOCKET on send room with answer : ", data);
      const rtcSessionDescription = new RTCSessionDescription(data.room.answer);
      if (peerConnection)
        await peerConnection.setRemoteDescription(rtcSessionDescription);
    })

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

        console.log("EVENT_ICE_CANDIDATE", event.candidate);
        // Send the ICE candidate to the remote peer
        // For simplicity, you can use a signaling server or a WebSocket to exchange ICE candidates
        // Example: socket.emit('candidate', event.candidate.toJSON());
        socket.emit('save caller candidate', event.candidate)



      } else {
        console.log('ICE candidate gathering completed.');
      }
    });
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    handleStartBroadcast(peerConnection, socket);

  };



  return (
    <div>
      <div>
        <h1>REGIE</h1>
        <h2>Remote Video</h2>
        <video ref={remoteVideoRef} autoPlay playsInline muted />
      </div>
    </div>
  );
};

export default App;
