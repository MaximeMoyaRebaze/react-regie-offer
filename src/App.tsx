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
  const stadeRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const fanPeerConnection = new RTCPeerConnection(configurationIceServer);
  const stadePeerConnection = new RTCPeerConnection(configurationIceServer);
  useEffect(() => {
    console.log("PEER CONNEXION STATE", fanPeerConnection.connectionState)
  }, [fanPeerConnection.connectionState])
  useEffect(() => {
    console.log("STADE PEER CONNEXION STATE", stadePeerConnection.connectionState)
  }, [stadePeerConnection.connectionState])

  // INITIALIZE 1 :
  useEffect(() => {

    const socket = io(serverUrlSocket);

    const remoteStream = new MediaStream()

    const initializeMediaStream = async (socket: Socket, remoteStream: MediaStream) => {
      try {

        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });



        socket.on('send room with answer', async (data: any) => {
          const rtcSessionDescription = new RTCSessionDescription(data.room.answer);


          await fanPeerConnection.setRemoteDescription(rtcSessionDescription);
          socket.on('send caller candidate', async (data: any) => {



            await fanPeerConnection.addIceCandidate(new RTCIceCandidate(data));
          })

        })


        fanPeerConnection.addEventListener('track', event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        });




        if (localStream) {
          localStream.getTracks().forEach((track) => {
            fanPeerConnection.addTrack(track, localStream);
          });
        }

        const offer = await fanPeerConnection.createOffer();

        fanPeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
          //console.log("ICE CANDIDATE", event.candidate)
          if (event.candidate) {
            socket.emit('save caller candidate', event.candidate)
          } else {
            console.log('ICE candidate gathering completed.');
          }
        });

        await fanPeerConnection.setLocalDescription(offer);

        socket.emit('save room with offer', { offer })





        if (localStream) {
          localStream.getTracks().forEach((track) => {
            console.log("Add local stream track to STADE peer connexion", track);
            stadePeerConnection.addTrack(track, localStream);
          });
        }
        socket.on('send stade room with answer', async (data: any) => {

          const rtcSessionDescription = new RTCSessionDescription(data);
          console.log('Connection to STADE', stadePeerConnection.currentRemoteDescription)

          await stadePeerConnection.setRemoteDescription(rtcSessionDescription);
          remoteStream.getTracks().forEach((track) => {
            console.log("Add remote stream track to STAAAADDDEEE peer connexion", track);
            stadePeerConnection.addTrack(track, remoteStream);
          });
        })

        socket.on('send stade callee candidate', async (data: any) => {
          console.log(`Got new stade remote ICE candidate: ${JSON.stringify(data)}`);
          await stadePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          // remoteStream.getTracks().forEach((track) => {
          //   console.log("Add remote stream track to peer connexion", track);
          //   stadePeerConnection.addTrack(track, remoteStream);
          // });
        })
        stadePeerConnection.addEventListener('track', event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
          if (stadeRemoteVideoRef.current) {
            stadeRemoteVideoRef.current.srcObject = event.streams[0];
          }
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


        // if (remoteStream) {
        //   console.log("REMOTE STREAM ADDED TO STADE CONNEXION", remoteStream)
        //   remoteStream.getTracks().forEach((track) => {
        //     stadePeerConnection.addTrack(track, remoteStream);
        //   });
        // }




        await stadePeerConnection.setLocalDescription(offerStade);

        socket.emit('save stade room with offer', { offer: offerStade })






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
        <h2>Stade Video</h2>
        <video ref={stadeRemoteVideoRef} autoPlay playsInline muted />
      </div>
    </div>
  );
};

export default App;
