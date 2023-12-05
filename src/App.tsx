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
  const serverUrlSocket = 'http://localhost:3001/regie'

  // REF :
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // useEffect(() => {
  //   console.log("PEER CONNEXION STATE", fanPeerConnection.connectionState)
  // }, [fanPeerConnection.connectionState])
  // useEffect(() => {
  //   console.log("STADE PEER CONNEXION STATE", stadePeerConnection.connectionState)
  // }, [stadePeerConnection.connectionState])


  // ------------------------
  //  REFACTOR IN PROGRESS <
  // ------------------------

  async function setRemoteDescriptionToPeerConnectionFromAnswer(fanPeerConnection: RTCPeerConnection, answer: RTCSessionDescriptionInit) {
    const rtcSessionDescription = new RTCSessionDescription(answer);
    await fanPeerConnection.setRemoteDescription(rtcSessionDescription);
  }

  async function addIceCandidateToPeerConnection(fanPeerConnection: RTCPeerConnection, candidate: RTCIceCandidateInit) {
    console.log(`Got new FAN remote ICE candidate: ${candidate}`);
    await fanPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function addTrackToPeerConnectionFromAStream(peerConnection: RTCPeerConnection, stream: MediaStream) {
    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    }
  }

  async function createAnOfferAndSendLocalDescriptionAndEmitOnSocket(peerConnection: RTCPeerConnection, socket: Socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('save room with offer', { offer })
  }

  async function createFanPeerConnection(socket: Socket, fanRemoteStream: MediaStream, regieLocalStream: MediaStream) {

    const fanPeerConnection = new RTCPeerConnection(configurationIceServer);

    // --------------------------------
    // PEER CONNECTION EVENT LISTENER :
    // --------------------------------

    fanPeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit('save caller candidate', event.candidate)
      } else {
        console.log('ICE candidate gathering completed.');
      }
    });

    fanPeerConnection.addEventListener('track', event => {
      event.streams[0].getTracks().forEach(track => {
        fanRemoteStream.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });

    // --------
    // SOCKET :
    // --------

    socket.on('send room with answer', async (data: any) => {
      await setRemoteDescriptionToPeerConnectionFromAnswer(fanPeerConnection, data.room.answer)

      // const rtcSessionDescription = new RTCSessionDescription(data.room.answer);
      // await fanPeerConnection.setRemoteDescription(rtcSessionDescription);

      socket.on('send caller candidate', async (data: any) => {
        await addIceCandidateToPeerConnection(fanPeerConnection, data)

        // await fanPeerConnection.addIceCandidate(new RTCIceCandidate(data));

      })
    })
    socket.on('send callee candidate', async (data: any) => {
      await addIceCandidateToPeerConnection(fanPeerConnection, data.candidate)

      // console.log(`Got new FAN remote ICE candidate: ${JSON.stringify(data)}`);
      // await fanPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

    })

    // --------
    // OTHER :
    // --------

    addTrackToPeerConnectionFromAStream(fanPeerConnection, regieLocalStream)

    // if (regieLocalStream) {
    //   regieLocalStream.getTracks().forEach((track) => {
    //     fanPeerConnection.addTrack(track, regieLocalStream);
    //   });
    // }

    await createAnOfferAndSendLocalDescriptionAndEmitOnSocket(fanPeerConnection, socket)

    // const offer = await fanPeerConnection.createOffer();
    // await fanPeerConnection.setLocalDescription(offer);
    // socket.emit('save room with offer', { offer })

    return fanPeerConnection
  }

  async function createStadePeerConnection(socket: Socket, fanRemoteStream: MediaStream, regieLocalStream: MediaStream) {
    const stadePeerConnection = new RTCPeerConnection(configurationIceServer);

    let toDelete: RTCRtpSender;
    if (regieLocalStream) {
      regieLocalStream.getTracks().forEach((track) => {
        console.log("Add local stream track to STADE peer connexion", track);

        toDelete = stadePeerConnection.addTrack(track, regieLocalStream);
      });
    }
    socket.on('send stade room with answer', async (data: any) => {

      const rtcSessionDescription = new RTCSessionDescription(data);
      console.log('Connection to STADE', stadePeerConnection.currentRemoteDescription)
      if (fanRemoteStream) {
        console.log("REMOTE STREAM ADDED TO STADE CONNEXION", fanRemoteStream)
        fanRemoteStream.getTracks().forEach((track) => {
          stadePeerConnection.removeTrack(toDelete)
          stadePeerConnection.addTrack(track, fanRemoteStream);
        });
      }
      await stadePeerConnection.setRemoteDescription(rtcSessionDescription);

    })

    socket.on('send stade callee candidate', async (data: any) => {
      console.log(`Got new stade remote ICE candidate: ${JSON.stringify(data)}`);
      await stadePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

    })
    stadePeerConnection.addEventListener('track', event => {
      event.streams[0].getTracks().forEach(track => {
        fanRemoteStream.addTrack(track);
      });

    });

    const offerStade = await stadePeerConnection.createOffer();

    stadePeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      //console.log("ICE CANDIDATE STADE", event.candidate)
      if (event.candidate) {
        socket.emit('save stade caller candidate', event.candidate)
      } else {
        console.log('ICE candidate gathering completed.');
      }
    });

    await stadePeerConnection.setLocalDescription(offerStade);

    socket.emit('save stade room with offer', { offer: offerStade })
  }

  // ------------------------
  //  REFACTOR IN PROGRESS />
  // ------------------------

  // INITIALIZE :
  useEffect(() => {

    const initialize = async () => {

      // const fanPeerConnection = new RTCPeerConnection(configurationIceServer);
      const socket = io(serverUrlSocket);
      const fanRemoteStream = new MediaStream()
      const regieLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      await createFanPeerConnection(socket, fanRemoteStream, regieLocalStream)

      // socket.on('send room with answer', async (data: any) => {
      //   const rtcSessionDescription = new RTCSessionDescription(data.room.answer);
      //   await fanPeerConnection.setRemoteDescription(rtcSessionDescription);
      //   socket.on('send caller candidate', async (data: any) => {
      //     await fanPeerConnection.addIceCandidate(new RTCIceCandidate(data));
      //   })

      // })
      // socket.on('send callee candidate', async (data: any) => {
      //   console.log(`Got new FAN remote ICE candidate: ${JSON.stringify(data)}`);
      //   await fanPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      // })

      // fanPeerConnection.addEventListener('track', event => {
      //   event.streams[0].getTracks().forEach(track => {
      //     fanRemoteStream.addTrack(track);
      //   });
      //   if (remoteVideoRef.current) {
      //     remoteVideoRef.current.srcObject = event.streams[0];
      //   }

      // });

      // if (localStream) {
      //   localStream.getTracks().forEach((track) => {
      //     fanPeerConnection.addTrack(track, localStream);
      //   });
      // }

      // const offer = await fanPeerConnection.createOffer();

      // fanPeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      //   //console.log("ICE CANDIDATE", event.candidate)
      //   if (event.candidate) {
      //     socket.emit('save caller candidate', event.candidate)
      //   } else {
      //     console.log('ICE candidate gathering completed.');
      //   }
      // });

      // await fanPeerConnection.setLocalDescription(offer);

      // socket.emit('save room with offer', { offer })


      //----------------------------------------------------------------------------------
      //----------------------------------------------------------------------------------

      await createStadePeerConnection(socket, fanRemoteStream, regieLocalStream)

      // const stadePeerConnection = new RTCPeerConnection(configurationIceServer);

      // let toDelete: RTCRtpSender;
      // if (regieLocalStream) {
      //   regieLocalStream.getTracks().forEach((track) => {
      //     console.log("Add local stream track to STADE peer connexion", track);

      //     toDelete = stadePeerConnection.addTrack(track, regieLocalStream);
      //   });
      // }
      // socket.on('send stade room with answer', async (data: any) => {

      //   const rtcSessionDescription = new RTCSessionDescription(data);
      //   console.log('Connection to STADE', stadePeerConnection.currentRemoteDescription)
      //   if (fanRemoteStream) {
      //     console.log("REMOTE STREAM ADDED TO STADE CONNEXION", fanRemoteStream)
      //     fanRemoteStream.getTracks().forEach((track) => {
      //       stadePeerConnection.removeTrack(toDelete)
      //       stadePeerConnection.addTrack(track, fanRemoteStream);
      //     });
      //   }
      //   await stadePeerConnection.setRemoteDescription(rtcSessionDescription);

      // })

      // socket.on('send stade callee candidate', async (data: any) => {
      //   console.log(`Got new stade remote ICE candidate: ${JSON.stringify(data)}`);
      //   await stadePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

      // })
      // stadePeerConnection.addEventListener('track', event => {
      //   event.streams[0].getTracks().forEach(track => {
      //     fanRemoteStream.addTrack(track);
      //   });

      // });

      // const offerStade = await stadePeerConnection.createOffer();

      // stadePeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
      //   //console.log("ICE CANDIDATE STADE", event.candidate)
      //   if (event.candidate) {
      //     socket.emit('save stade caller candidate', event.candidate)
      //   } else {
      //     console.log('ICE candidate gathering completed.');
      //   }
      // });

      // await stadePeerConnection.setLocalDescription(offerStade);

      // socket.emit('save stade room with offer', { offer: offerStade })

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

export default App;
