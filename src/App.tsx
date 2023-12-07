import './App.css'

import { Box, Button, SimpleGrid, VStack } from '@chakra-ui/react';
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





      await Implementations.createStadePeerConnection(stadePeerConnection, socket)
    };

    initialize();

  }, []);

  return (
    <div>
      <div>
        <h2>MODÉRATEUR</h2>
        <h3>Remote Video</h3>
        <SimpleGrid columns={8} spacing={"210px"}>
          {
            remoteStreams.map(({ mediaStream, remoteVideoRef }, index) => (
              <VStack key={index} >
                <h3>Fan {1 + index}</h3>
                <Box >
                  <video ref={remoteVideoRef} width="200" height={"200"} autoPlay playsInline muted /></Box>
                {stadePeerConnection && mediaStream && <Button onClick={() => {

                  stadePeerConnection.getSenders().forEach((sender) => {
                    sender.replaceTrack(mediaStream.getTracks()[0])
                  })
                }}>Select a fan {1 + index}</Button>}
              </VStack>
            ))
          }</SimpleGrid>

      </div>
    </div>
  );
};
