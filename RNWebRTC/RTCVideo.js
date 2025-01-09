import React, { useEffect, useState, useRef } from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from "react-native-webrtc";
import * as Permissions from "react-native-permissions";

// WebRTC config
const config = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ],
};

const createOffer = async (pc) => {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  } catch (e) {
    console.log(e);
  }
};
const createAnswer = async (pc, offer) => {
  try {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  } catch (e) {
    console.log(e);
  }
};

const RTCVideo = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [status, setStatus] = useState("idle");
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    requestCameraAndMicPermission();

    return () => {
      if (localStream) {
        localStream.release();
      }
    };
  }, []);

  useEffect(() => {
    if (peerConnection) {
      peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
          //send candidate to the other peer
          console.log("send candidate: ", e.candidate);
        }
      };

      peerConnection.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          console.log("got remote stream");
          setRemoteStream(e.streams[0]);
        }
      };
    }
  }, [peerConnection]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const requestCameraAndMicPermission = async () => {
    try {
      const cameraStatus = await Permissions.request(
        Platform.select({
          ios: Permissions.PERMISSIONS.IOS.CAMERA,
          android: Permissions.PERMISSIONS.ANDROID.CAMERA,
        })
      );
      const micStatus = await Permissions.request(
        Platform.select({
          ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
          android: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
        })
      );

      if (cameraStatus === "granted" && micStatus === "granted") {
        console.log("Permissions Granted");
        getMediaStream();
      } else {
        console.log("Camera or microphone permission denied");
      }
    } catch (e) {
      console.log("error", e);
    }
  };

  const getMediaStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
        },
      });
      setLocalStream(stream);
      console.log("got local stream");
    } catch (e) {
      console.log("error getting media stream", e);
    }
  };

  const call = async () => {
    setStatus("calling");
    const pc = new RTCPeerConnection(config);
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }
    setPeerConnection(pc);
    try {
      const offer = await createOffer(pc);
      // send the offer to the other peer
      console.log("send offer: ", offer);
      //when you receive the answer from the other peer
      // you will set it to this peer by calling setRemoteDescription and then you are connected.
    } catch (e) {
      console.log("error creating offer", e);
    }
  };

  const acceptCall = async (offer) => {
    setStatus("accepted");
    const pc = new RTCPeerConnection(config);
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }
    setPeerConnection(pc);
    try {
      const answer = await createAnswer(pc, offer);
      //send the answer to the calling peer
      console.log("send answer: ", answer);
      // if you get a new candidate send the ice candidate
    } catch (e) {
      console.log("error creating answer", e);
    }
  };

  const onRemoteAnswer = async (answer) => {
    console.log("receive answer: ", answer);
    try {
      await peerConnection.setRemoteDescription(answer);
      setStatus("connected");
    } catch (e) {
      console.log("error setting remote answer", e);
    }
  };

  const onRemoteIceCandidate = async (candidate) => {
    console.log("receive candidate", candidate);
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.log("error adding ice candidate", e);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {localStream && (
        <RTCView
          style={{ width: 200, height: 200, margin: 10 }}
          mirror={true}
          ref={localVideoRef}
          objectFit="cover"
          //streamURL={localStream.toURL()} //can be used but `srcObject` is preferred
        />
      )}
      {remoteStream && (
        <RTCView
          style={{ width: 200, height: 200, margin: 10 }}
          ref={remoteVideoRef}
          objectFit="cover"
          // streamURL={remoteStream.toURL()} //can be used but `srcObject` is preferred
        />
      )}
      <TouchableOpacity
        style={{
          backgroundColor: "blue",
          padding: 10,
          margin: 10,
          borderRadius: 5,
        }}
        onPress={status === "idle" ? call : null}
      >
        <Text style={{ color: "white" }}>
          {status === "idle" ? "Call" : `status: ${status}`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          backgroundColor: "green",
          padding: 10,
          margin: 10,
          borderRadius: 5,
        }}
        onPress={() => {
          acceptCall();
        }}
      >
        <Text style={{ color: "white" }}>Accept Call</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          backgroundColor: "yellow",
          padding: 10,
          margin: 10,
          borderRadius: 5,
        }}
        onPress={() => {
          onRemoteAnswer();
        }}
      >
        <Text style={{ color: "black" }}>Receive Answer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          backgroundColor: "orange",
          padding: 10,
          margin: 10,
          borderRadius: 5,
        }}
        onPress={() => {
          onRemoteIceCandidate();
        }}
      >
        <Text style={{ color: "black" }}>Receive ICE Candidate</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RTCVideo;
