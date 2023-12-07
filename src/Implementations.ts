import { empty } from 'effect/Order';
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

// function addTrackToPeerConnectionFromAStream(peerConnection: RTCPeerConnection): RTCRtpSender[] {

//     return stream.getTracks().map((track) => peerConnection.addTrack(track, stream));

// }

async function createAnOfferForFansAndSendLocalDescriptionAndEmitOnSocket(peerConnection: RTCPeerConnection, socket: Socket, socketMessage: string, regieRoomId: string) {
    peerConnection.addTransceiver('video', { direction: 'recvonly' });
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit(socketMessage, { room: { offer }, regieRoomId })
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

export async function createFanPeerConnection(socket: Socket, fanRemoteStream: MediaStream, remoteVideoRef: React.RefObject<HTMLVideoElement>, id: string) {

    const fanPeerConnection = new RTCPeerConnection(configurationIceServer);

    // --------------------------------
    // PEER CONNECTION EVENT LISTENER :
    // --------------------------------

    fanPeerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
            console.log(`Got new FAN local ICE candidate: ${JSON.stringify(event.candidate)}`);
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
        // socket.on('send fan caller candidate', async (data: any) => {
        //     await addIceCandidateToPeerConnection(fanPeerConnection, data)
        // })
    })
    socket.on('send fan callee candidate', async (data: { candidate: RTCIceCandidateInit, regieRoomId: string }) => {
        if (data.regieRoomId !== id) return
        await addIceCandidateToPeerConnection(fanPeerConnection, data.candidate)
    })

    // --------
    // OTHER :
    // --------

    // addTrackToPeerConnectionFromAStream(fanPeerConnection)

    await createAnOfferForFansAndSendLocalDescriptionAndEmitOnSocket(fanPeerConnection, socket, 'save regie room with offer for fan', id)
    return fanRemoteStream
}

export async function createStadePeerConnection(stadePeerConnection: RTCPeerConnection, socket: Socket, fanRemoteStream: MediaStream, regieLocalStream: MediaStream) {



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

    const senderToDelete: RTCRtpSender | null = createSenderToDeleteAndAddTrackToPeerConnectionFromAStream(stadePeerConnection, regieLocalStream)

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
    const emptyStream = new MediaStream();
    emptyStream.getTracks().forEach((track) => {
        stadePeerConnection.addTrack(track, emptyStream);
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