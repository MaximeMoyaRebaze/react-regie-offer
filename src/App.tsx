import './App.css'

import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

import * as Implementations from './Implementations'

export const App: React.FC = () => {

  // BACKEND :
  const serverUrlSocket = 'http://localhost:3001/regie'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef2 = useRef<HTMLVideoElement>(null);
  const [stadePeerConnection, setStadePeerConnection] = React.useState<RTCPeerConnection | null>(null);
  const [fanRemoteStreamId1, setFanRemoteStreamId1] = React.useState<RTCRtpSender[]>([]);
  const [fanRemoteStreamId2, setFanRemoteStreamId2] = React.useState<RTCRtpSender[]>([]);

  const fanRemoteStream = new MediaStream()
  const fanRemoteStream2 = new MediaStream()
  // INITIALIZE :
  useEffect(() => {
    const stadePeerConnection = new RTCPeerConnection(Implementations.configurationIceServer);
    setStadePeerConnection(stadePeerConnection);
    const initialize = async () => {
      const socket = io(serverUrlSocket);

      const regieLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      setFanRemoteStreamId1(await Implementations.createFanPeerConnection(socket, fanRemoteStream, regieLocalStream, remoteVideoRef, "1"))
      setFanRemoteStreamId2(await Implementations.createFanPeerConnection(socket, fanRemoteStream2, regieLocalStream, remoteVideoRef2, "2"))

      await Implementations.createStadePeerConnection(stadePeerConnection, socket, fanRemoteStream, regieLocalStream)
    };

    initialize();

  }, []);

  return (
    <div>
      <div>
        <h1>REGIE</h1>
        <h2>Remote Video</h2>
        <h3>Fan 1</h3>
        <video ref={remoteVideoRef} autoPlay playsInline muted />
        {stadePeerConnection && <button onClick={() => {

          fanRemoteStreamId2.forEach((track) => {
            stadePeerConnection.removeTrack(track);
          })
          fanRemoteStream.getTracks().forEach((track) => {

            stadePeerConnection.addTrack(track, fanRemoteStream);
          });
        }}>Select fan 1</button>}
        <h3>Fan 2</h3>
        <video ref={remoteVideoRef2} autoPlay playsInline muted />
        {stadePeerConnection && <button onClick={() => {

          fanRemoteStreamId1.forEach((track) => {
            stadePeerConnection.removeTrack(track);
          })
          fanRemoteStream2.getTracks().forEach((track) => {

            stadePeerConnection.addTrack(track, fanRemoteStream2);
          });
        }}>Select fan 2</button>}
      </div>
    </div>
  );
};
