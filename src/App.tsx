import './App.css'

import type { RefObject } from 'react';
import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { ulid } from 'ulid'

import * as Implementations from './Implementations'

export const App: React.FC = () => {

  // BACKEND :
  // const serverUrlSocket = 'http://localhost:3001/regie'
  const serverUrlSocket = 'https://back-end-fan-cam-e765fca54737.herokuapp.com/regie'

  // REF :

  const [stadePeerConnection, setStadePeerConnection] = React.useState<RTCPeerConnection | null>(null);

  const [remoteStreams, setRemoteStreams] = React.useState<{ mediaStream: MediaStream; remoteVideoRef: RefObject<HTMLVideoElement>; }[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(() => ({ mediaStream: new MediaStream(), remoteVideoRef: useRef<HTMLVideoElement>(null) })))




  // INITIALIZE :
  useEffect(() => {
    const stadePeerConnection = new RTCPeerConnection(Implementations.configurationIceServer);
    setStadePeerConnection(stadePeerConnection);
    const initialize = async () => {
      const socket = io(serverUrlSocket);









      setRemoteStreams(await Promise.all(

        remoteStreams.map(async ({ mediaStream, remoteVideoRef }) => {




          const remoteStream = await Implementations.createFanPeerConnection(socket, mediaStream, remoteVideoRef, ulid())
          return { mediaStream: remoteStream, remoteVideoRef }
        })))





      await Implementations.createStadePeerConnection(stadePeerConnection, socket, remoteStreams[0].mediaStream)
    };

    initialize();

  }, []);

  return (
    <div>
      <div>
        <h1>REGIE</h1>
        <h2>Remote Video</h2>
        {
          remoteStreams.map(({ mediaStream, remoteVideoRef }, index) => (
            <div key={index}>
              <h3>Fan {index}</h3>
              <video ref={remoteVideoRef} autoPlay playsInline muted />
              {stadePeerConnection && mediaStream && <button onClick={() => {

                stadePeerConnection.getSenders().forEach((sender) => {
                  console.log('sender', sender)
                  console.log('mediaStream', mediaStream.getTracks()[0])
                  sender.replaceTrack(mediaStream.getTracks()[0])
                })
              }}>Select fan {index}</button>}
            </div>
          ))
        }

      </div>
    </div>
  );
};
