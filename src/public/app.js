const socket = io();

const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const myFace = document.createElement("video");
myFace.setAttribute("autoplay","");
myFace.setAttribute("plyasinline","");
myFace.setAttribute("width","800");
myFace.setAttribute("height","400");
const myStreamDiv = document.getElementById("myStream");
myStreamDiv.appendChild(myFace); 

const welcome = document.getElementById("welcome")
const call = document.getElementById("call")
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device)=>device.kind==="videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera)=>{
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
                console.log(currentCamera.label);
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        })
    }catch(e){
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialConstraints = {
        audio : true,
        video : { facingMode : "user" },
    };

    const cameraConstraints = {
        audio : true,
        video : { deviceId : {exact : deviceId}},
    };

    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialConstraints
        )
        myFace.srcObject = myStream;
        if(!deviceId){
            await getCameras();
        }
        
        
    }catch(e){
        console.log(e);
    }
}
getMedia();

// Mute fucntion
muteBtn.addEventListener('click', ()=>{
    myStream
        .getAudioTracks()
        .forEach((track)=>track.enabled=!track.enabled);
    if(!muted){
        muteBtn.innerText = "Unmuted";
        muted = true;
    }else{
        muteBtn.innerText = "Muted";
        muted = false;
    }
})

// Camera Off fucntion
cameraBtn.addEventListener('click', ()=>{
    myStream
        .getVideoTracks()
        .forEach((track)=>track.enabled=!track.enabled);
    if(cameraOff){
        cameraBtn.innerText = "Turn Off";
        cameraOff = false;
    }else{
        cameraBtn.innerText = "Turn On";
        cameraOff = true;
    }
})

async function handleCameraChange(){
    await getMedia(cameraSelect.value);
    if(myPeerConnection){
        // Stream for ME
        const videoTrack = myStream.getVideoTracks()[0];
        // Stream for Peer
        const videoSender = myPeerConnection.getSenders().find((sender)=>sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

// Camera Select
cameraSelect.addEventListener('input', handleCameraChange);

async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

welcomeForm = welcome.querySelector("form");
welcomeForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value="";
})

/// Socket Code
socket.on("welcome", async ()=>{
    // DataChannel
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (e)=>{
        console.log(e);
    })
    console.log("make data Channel");

    // webRTC
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("Send the OFFER");
    socket.emit("offer", offer, roomName);
})

socket.on("offer", async (offer)=>{
    // DataChannel
    myPeerConnection.addEventListener("datachannel", (e)=>{
        myDataChannel = e.channel;
        myDataChannel.addEventListener("message", console.log)
    })
    console.log()
    // webRTC
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("Send the ANSWER");
})

socket.on("answer", (answer)=>{
    console.log("receive the ANSWER");
    myPeerConnection.setRemoteDescription(answer);
    
})

socket.on("ice", (ice)=>{
    console.log("Recieved the Candidate");
    myPeerConnection.addIceCandidate(ice);
})

/// RTC Code
function makeConnection(){
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", (data)=>{
        console.log("Send the Candidate");
        socket.emit("ice", data.candidate, roomName);
    })
    myPeerConnection.addEventListener("addstream", (data)=>{
        console.log("got an stream from my peer");
        console.log("Peer's Stream", data.stream);
        console.log("My Stream", myStream);
        // Create New Camera Element
        const peerFace = document.createElement("video");
        peerFace.setAttribute("autoplay","");
        peerFace.setAttribute("plyasinline","");
        peerFace.setAttribute("width","800");
        peerFace.setAttribute("height","400");
        myStreamDiv.appendChild(peerFace); 
        peerFace.srcObject = data.stream;
    })
    myStream.getTracks().forEach((track)=>{
        myPeerConnection.addTrack(track, myStream);
    })
}