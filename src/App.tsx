import './App.css'
import React, { useEffect, useRef } from 'react';
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
  const serverUrlSocket = 'http://localhost:3001/'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // INITIALIZE 1 :
  useEffect(() => {

    const socket = io(serverUrlSocket);
    socket.on('connect', () => {
      console.log('SOCKET CONNECTED');
    });

    const remoteStream = new MediaStream()

    const initializeMediaStream = async (socket: Socket, remoteStream: MediaStream) => {
      try {

        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        const peerConnection = new RTCPeerConnection(configurationIceServer);

        socket.on('send room with answer', async (data: any) => {
          const rtcSessionDescription = new RTCSessionDescription(data.room.answer);
          if (peerConnection)
            await peerConnection.setRemoteDescription(rtcSessionDescription);
        })

        peerConnection.addEventListener('track', event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        });

        peerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
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

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('save room with offer', { offer })

      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };

    initializeMediaStream(socket, remoteStream);

  }, []);

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
