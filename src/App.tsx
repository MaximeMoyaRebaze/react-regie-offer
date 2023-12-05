import './App.css'

import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

import * as Implementations from './Implementations'

export const App: React.FC = () => {

  // BACKEND :
  const serverUrlSocket = 'http://localhost:3001/regie'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // INITIALIZE :
  useEffect(() => {

    const initialize = async () => {
      const socket = io(serverUrlSocket);
      const fanRemoteStream = new MediaStream()
      const regieLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      await Implementations.createFanPeerConnection(socket, fanRemoteStream, regieLocalStream, remoteVideoRef)
      await Implementations.createStadePeerConnection(socket, fanRemoteStream, regieLocalStream)
    };

    initialize();

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
