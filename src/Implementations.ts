import { Socket } from 'socket.io-client';

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

async function createAnOfferAndSendLocalDescriptionAndEmitOnSocket(peerConnection: RTCPeerConnection, socket: Socket, emitOnSocket: string) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit(emitOnSocket, { offer })
}

function createSenderToDeleteAndAddTrackToPeerConnectionFromAStream(peerConnection: RTCPeerConnection, stream: MediaStream) {
    let senderToDelete: RTCRtpSender | null = null;
    if (stream) {
        stream.getTracks().forEach((track) => {
            console.log("Add local stream track to peer connexion", track);
            senderToDelete = peerConnection.addTrack(track, stream);
        });
    }
    return senderToDelete
}

export async function createFanPeerConnection(socket: Socket, fanRemoteStream: MediaStream, regieLocalStream: MediaStream, remoteVideoRef: React.RefObject<HTMLVideoElement>) {

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
        socket.on('send caller candidate', async (data: any) => {
            await addIceCandidateToPeerConnection(fanPeerConnection, data)
        })
    })
    socket.on('send callee candidate', async (data: any) => {
        await addIceCandidateToPeerConnection(fanPeerConnection, data.candidate)
    })

    // --------
    // OTHER :
    // --------

    addTrackToPeerConnectionFromAStream(fanPeerConnection, regieLocalStream)

    await createAnOfferAndSendLocalDescriptionAndEmitOnSocket(fanPeerConnection, socket, 'save room with offer')

    return fanPeerConnection
}

export async function createStadePeerConnection(socket: Socket, fanRemoteStream: MediaStream, regieLocalStream: MediaStream) {

    const stadePeerConnection = new RTCPeerConnection(configurationIceServer);

    // --------------------------------
    // PEER CONNECTION EVENT LISTENER :
    // --------------------------------

    stadePeerConnection.addEventListener('icecandidate', async (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
            socket.emit('save stade caller candidate', event.candidate)
        } else {
            console.log('ICE candidate gathering completed.');
        }
    });

    stadePeerConnection.addEventListener('track', event => {
        event.streams[0].getTracks().forEach(track => {
            fanRemoteStream.addTrack(track);
        });
    });

    // --------
    // SOCKET :
    // --------

    const senderToDelete: RTCRtpSender | null = createSenderToDeleteAndAddTrackToPeerConnectionFromAStream(stadePeerConnection, regieLocalStream)

    socket.on('send stade room with answer', async (data: any) => {

        const rtcSessionDescription = new RTCSessionDescription(data);
        console.log('Connection to STADE', stadePeerConnection.currentRemoteDescription)
        if (fanRemoteStream) {
            console.log("REMOTE STREAM ADDED TO STADE CONNEXION", fanRemoteStream)
            fanRemoteStream.getTracks().forEach((track) => {
                if (senderToDelete) { stadePeerConnection.removeTrack(senderToDelete) }
                stadePeerConnection.addTrack(track, fanRemoteStream);
            });
        }
        await stadePeerConnection.setRemoteDescription(rtcSessionDescription);

    })

    socket.on('send stade callee candidate', async (data: any) => {
        console.log(`Got new stade remote ICE candidate: ${JSON.stringify(data)}`);
        await stadePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

    })

    // -------
    // OTHER :
    // -------

    await createAnOfferAndSendLocalDescriptionAndEmitOnSocket(stadePeerConnection, socket, 'save stade room with offer')

    return stadePeerConnection
}