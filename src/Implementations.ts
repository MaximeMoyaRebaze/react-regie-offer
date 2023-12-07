import type { Socket } from 'socket.io-client';

// TURN ICE SERVER CONFIG :
export const configurationIceServer = {
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
    console.log(`Got new FAN remote ICE candidate: ${JSON.stringify(candidate)}`);
    await fanPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}



async function createAnOfferForFansAndSendLocalDescriptionAndEmitOnSocket(peerConnection: RTCPeerConnection, socket: Socket, socketMessage: string, regieRoomId: string) {
    peerConnection.addTransceiver('video', { direction: 'recvonly' });
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit(socketMessage, { room: { offer }, regieRoomId })
}

function createSenderToDeleteAndAddTrackToPeerConnectionFromAStream(peerConnection: RTCPeerConnection) {

    const canvas = document.createElement('canvas');
    canvas.width = 640; // Set width as needed
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'black'; // Set the color to black or any other color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Create a blank video track using the canvas as the source
    const blankVideoTrack = canvas.captureStream().getVideoTracks()[0];

    // Replace the original video track with the blank video track



    return peerConnection.addTrack(blankVideoTrack, new MediaStream());
}

export async function createFanPeerConnection(socket: Socket, fanRemoteStream: MediaStream, remoteVideoRef: React.RefObject<HTMLVideoElement>, id: string) {

    const fanPeerConnection = new RTCPeerConnection(configurationIceServer);

    // --------------------------------
    // PEER CONNECTION EVENT LISTENER :
    // --------------------------------

    fanPeerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
            // console.log(`Got new FAN local ICE candidate: ${JSON.stringify(event.candidate)}`);
            socket.emit('save regie caller candidate for fan', { candidate: event.candidate, regieRoomId: id })
        } else {
            console.log('ICE candidate gathering completed.');
        }
    });

    fanPeerConnection.addEventListener('track', event => {
        event.streams[0].getTracks().forEach(track => {

            fanRemoteStream.addTrack(track);
            console.log(`REMOTE STREAM ADDED TO FAN CONNEXION for fan ${id}`, fanRemoteStream.getTracks())
        });
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
        }
    });

    // --------
    // SOCKET :
    // --------

    socket.on('send fan room with answer', async (data: { room: { answer: RTCSessionDescriptionInit }, regieRoomId: string }) => {
        console.log('Connection to FANNNNNNNN', data)
        if (data.regieRoomId !== id) return
        await setRemoteDescriptionToPeerConnectionFromAnswer(fanPeerConnection, data.room.answer)

    })
    socket.on('send fan callee candidate', async (data: { candidate: RTCIceCandidateInit, regieRoomId: string }) => {
        if (data.regieRoomId !== id) return
        await addIceCandidateToPeerConnection(fanPeerConnection, data.candidate)
    })

    // --------
    // OTHER :
    // --------



    await createAnOfferForFansAndSendLocalDescriptionAndEmitOnSocket(fanPeerConnection, socket, 'save regie room with offer for fan', id)
    return fanRemoteStream
}

export async function createStadePeerConnection(stadePeerConnection: RTCPeerConnection, socket: Socket, fanRemoteStream: MediaStream) {



    // --------------------------------
    // PEER CONNECTION EVENT LISTENER :
    // --------------------------------

    stadePeerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
            socket.emit('save regie caller candidate for stade', event.candidate)
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

    const senderToDelete: RTCRtpSender | null = createSenderToDeleteAndAddTrackToPeerConnectionFromAStream(stadePeerConnection)

    socket.on('send stade room with answer', async (data: { answer: RTCSessionDescriptionInit }) => {

        const rtcSessionDescription = new RTCSessionDescription(data.answer);
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

    socket.on('send stade callee candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        console.log(`Got new stade remote ICE candidate: ${JSON.stringify(data)}`);
        await stadePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

    })

    // -------
    // OTHER :
    // -------
    stadePeerConnection.addTransceiver('video', { direction: 'sendonly' });
    const offer = await stadePeerConnection.createOffer();
    await stadePeerConnection.setLocalDescription(offer);
    socket.emit('save regie room with offer for stade', { offer })


    return stadePeerConnection
}