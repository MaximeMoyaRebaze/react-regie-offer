import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { addDoc, collection, doc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import './App.css'

function App() {

  // FIREBASE CONFIG :
  const firebaseConfig = {
    apiKey: "AIzaSyABo_Nw1vxbUBx7CN6M739FExqOu8wlkSA",
    authDomain: "poc-web-rtc-1403a.firebaseapp.com",
    projectId: "poc-web-rtc-1403a",
    storageBucket: "poc-web-rtc-1403a.appspot.com",
    messagingSenderId: "761191572427",
    appId: "1:761191572427:web:684fd98a2d1193eae10c4e",
    measurementId: "G-V3B6VDE0JL"
  };
  const appFirebase = initializeApp(firebaseConfig);
  const db = getFirestore(appFirebase);

  // TURN ICE SERVER CONFIG :
  const configuration = {
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

  // VARIABLES :
  let peerConnection: RTCPeerConnection;
  let stream: MediaStream;
  let localStream: MediaStream;
  let remoteStream: MediaStream;
  let roomId: string;

  const [textRoomId, setTextRoomId] = useState('')

  // INITIALISE EVENT LISTENER :
  useEffect(() => {
    const cameraBtn = document.querySelector('#cameraBtn');
    const hangupBtn = document.querySelector('#hangupBtn');
    const createBtn = document.querySelector('#createBtn');
    const joinBtn = document.querySelector('#joinBtn');
    // const roomDialog = new MDCDialog(document.querySelector('#room-dialog'));

    if (cameraBtn) {
      cameraBtn.addEventListener('click', openUserMedia);
    }
    if (createBtn) {
      createBtn.addEventListener('click', createRoom);
    }
    if (joinBtn) {
      // joinBtn.addEventListener('click', joinRoom);
    }
    if (hangupBtn) {
      // hangupBtn.addEventListener('click', hangUp);
    }

    // PEER CONNECTION LOGS :
    if (peerConnection) {
      peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
          `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
      });

      peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
      });

      peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change: ${peerConnection.signalingState}`);
      });

      peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
          `ICE connection state change: ${peerConnection.iceConnectionState}`);
      });
    }


    return () => {
      if (cameraBtn) {
        cameraBtn.removeEventListener('click', openUserMedia);
      }
      if (createBtn) {
        createBtn.removeEventListener('click', createRoom);
      }
      if (joinBtn) {
        // joinBtn.removeEventListener('click', joinRoom);
      }
      if (hangupBtn) {
        // hangupBtn.removeEventListener('click', hangUp);
      }
      if (peerConnection) {
        peerConnection.removeEventListener('icegatheringstatechange', () => {
          console.log(
            `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
        });

        peerConnection.removeEventListener('connectionstatechange', () => {
          console.log(`Connection state change: ${peerConnection.connectionState}`);
        });

        peerConnection.removeEventListener('signalingstatechange', () => {
          console.log(`Signaling state change: ${peerConnection.signalingState}`);
        });

        peerConnection.removeEventListener('iceconnectionstatechange ', () => {
          console.log(
            `ICE connection state change: ${peerConnection.iceConnectionState}`);
        });
      }
    };
  }, []);

  async function openUserMedia() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      (document.querySelector('#localVideo') as HTMLVideoElement).srcObject = stream;
      localStream = stream;
      remoteStream = new MediaStream();
      (document.querySelector('#remoteVideo') as HTMLVideoElement).srcObject = remoteStream;

      console.log('Stream:', (document.querySelector('#localVideo') as HTMLVideoElement).srcObject);
      (document.querySelector('#cameraBtn') as HTMLButtonElement).disabled = true;
      (document.querySelector('#joinBtn') as HTMLButtonElement).disabled = false;
      (document.querySelector('#createBtn') as HTMLButtonElement).disabled = false;
      (document.querySelector('#hangupBtn') as HTMLButtonElement).disabled = false;
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }


  async function createRoom() {
    const createBtn = document.querySelector('#createBtn') as HTMLButtonElement;
    const joinBtn = document.querySelector('#joinBtn') as HTMLButtonElement;
    createBtn.disabled = true;
    joinBtn.disabled = true;

    // const roomRef = await db.collection('rooms').doc();
    const dbRoom = collection(db, 'rooms')
    const roomRef = doc(dbRoom);

    console.log('Create PeerConnection with configuration: ', configuration);
    const peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // const callerCandidatesCollection = roomRef.collection('callerCandidates');
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates')

    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got candidate: ', event.candidate);
      // callerCandidatesCollection.add(event.candidate.toJSON());
      addDoc(callerCandidatesCollection, event.candidate.toJSON())

    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('Created offer:', offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    };

    console.log('roomWithOffer', roomWithOffer);

    // const response = await roomRef.set(roomWithOffer);
    const response = await setDoc(roomRef, roomWithOffer);
    console.log('response', response);
    console.log('roomWithOffer 2222');

    roomId = roomRef.id;
    console.log(`New room created with SDP offer. Room ID: ${roomId}`);

    // document.querySelector('#currentRoom')!.innerText = `Current room is ${roomId} - You are the caller!`;
    setTextRoomId(`Current room is ${roomId} - You are the caller!`)

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // roomRef.onSnapshot(async snapshot => {
    //   const data = snapshot.data();
    //   if (!peerConnection.currentRemoteDescription && data && data.answer) {
    //     console.log('Got remote description: ', data.answer);
    //     const rtcSessionDescription = new RTCSessionDescription(data.answer);
    //     await peerConnection.setRemoteDescription(rtcSessionDescription);
    //   }
    // });
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data && data.answer) {
        console.log('Got remote description: ', data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    })

    // roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    //   snapshot.docChanges().forEach(async change => {
    //     if (change.type === 'added') {
    //       const data = change.doc.data();
    //       console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
    //       await peerConnection.addIceCandidate(new RTCIceCandidate(data));
    //     }
    //   });
    // });
    const roomCollection = collection(roomRef, 'calleeCandidates')
    onSnapshot(roomCollection, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    })

  }

  return (
    <>

      <button
        className="mdc-button mdc-button--raised"
        id="cameraBtn"
      // startIcon={<icon className="material-icons">perm_camera_mic</icon>}
      >
        Open camera & microphone
      </button>

      <button disabled id="createBtn">
        <i aria-hidden="true">group_add</i>
        <span>Create room</span>
      </button>

      <button disabled id="joinBtn">
        <i aria-hidden="true">group</i>
        <span>Join room</span>
      </button>

      <button disabled id="hangupBtn">
        <i aria-hidden="true">close</i>
        <span>Hangup</span>
      </button>

      <br />
      <span>{textRoomId}</span>

      <br />
      <div id="videos">
        <video id="localVideo" muted autoPlay playsInline></video>
        <video id="remoteVideo" autoPlay playsInline></video>
      </div>


    </>
  )
}

export default App
