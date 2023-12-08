import './App.css'

import { Box, Button, SimpleGrid, VStack } from '@chakra-ui/react'
import type { RefObject } from 'react'
import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'
import { ulid } from 'ulid'

import * as Implementations from './Implementations'

export const App: React.FC = () => {
  // BACKEND :
  const serverUrlSocket = 'http://localhost:3001/regie'
  // const serverUrlSocket = 'https://back-end-fan-cam-e765fca54737.herokuapp.com/regie'

  // REF :

  const [stadePeerConnection, setStadePeerConnection] = React.useState<RTCPeerConnection | null>(null)

  const [remoteStreams, setRemoteStreams] = React.useState<
    { remoteStream: MediaStream; remoteVideoRef: RefObject<HTMLVideoElement> }[]
  >([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(
    () => ({ remoteStream: new MediaStream(), remoteVideoRef: useRef<HTMLVideoElement>(null) })
  ))

  // INITIALIZE :
  useEffect(() => {
    const stadePeerConnection = new RTCPeerConnection(Implementations.configurationIceServer)
    setStadePeerConnection(stadePeerConnection)
    const initialize = async () => {
      const socket = io(serverUrlSocket)

      setRemoteStreams(
        await Promise.all(
          remoteStreams.map(async ({ remoteStream, remoteVideoRef }) => {
            const fanStream = await Implementations.createFanPeerConnection(socket, remoteStream, remoteVideoRef, ulid())
            return { remoteStream: fanStream, remoteVideoRef }
          })
        )
      )

      await Implementations.createStadePeerConnection(stadePeerConnection, socket)
    }

    initialize()
  }, [])

  return (
    <div>
      <div>
        <h2>MODÉRATEUR</h2>
        <h3>Remote Video</h3>
        <SimpleGrid columns={8} spacing={'210px'}>
          {remoteStreams.map(({ remoteStream, remoteVideoRef }, index) => (
            <VStack key={index}>
              <h3>Fan {1 + index}</h3>
              <Box>
                <video ref={remoteVideoRef} width="200" height={'200'} autoPlay playsInline muted />
              </Box>
              {stadePeerConnection && remoteStream && (
                <Button
                  onClick={() => {
                    stadePeerConnection.getSenders().forEach(sender => {
                      const remote = remoteStream.getTracks()[0]
                      console.log('remote', remote)
                      console.log('sender', sender)
                      sender.replaceTrack(remote)
                    })
                  }}
                >
                  Select
                </Button>
              )}
            </VStack>
          ))}
        </SimpleGrid>
      </div>
    </div>
  )
}
