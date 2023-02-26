import { PageContainer } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { useEffect, useState } from 'react';

const ShareScreen: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [shareScreenStartBtn, setShareScreenStartBtn] = useState(true);
  const [peerConnection, setPeerConnection] = useState<any>(new RTCPeerConnection());
  const [name, setName] = useState<string>();
  const [targetName, setTargetName] = useState<string>();
  const [ws, setWs] = useState<WebSocket>(new WebSocket('ws://localhost:3002', name));
  const [sourceOffer, setSourceOffer] = useState<any>();
  const [userList, setUserList] = useState<string[]>();
  const [srcVideo, setSrcVideo] = useState<any>();
  const [connectType, setConnectType] = useState<'sender' | 'recipient' | 'wait'>('wait');
  useEffect(() => {
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      setShareScreenStartBtn(false);
    } else {
      messageApi.info('此设备不支持屏幕共享！');
    }
    setName((Math.random() * 1000).toFixed(0).toString());
  }, []);
  const endCall = () => {
    //const videos = document.getElementById('video') as any;
    srcVideo.pause();
    peerConnection.close();
  };

  const error = () => {
    endCall();
  };
  const createAnswer = () => {};
  useEffect(() => {
    setWs(new WebSocket('ws://localhost:3002', name));
    ws.onopen = (evt: any) => {
      console.log('ws open ...');
      console.log(evt);
      ws.send(JSON.stringify({ name, type: 'init', targetName }));
    };
    const closeHandler = () => {
      if (peerConnection) {
        //const video = document.getElementById('video') as any;
        if (srcVideo.srcObject)
          srcVideo.srcObject.getTracks().forEach((v: any) => {
            v.stop();
          });
        srcVideo.srcObject = null;
      }
    };
    ws.onmessage = (evt) => {
      let res: any = {};
      try {
        res = JSON.parse(evt.data);
      } catch {}
      console.log(res.type);
      if (res.type === 'offer') {
        console.log(res);
        setConnectType('recipient');
        setSourceOffer(res.offer);
        setTargetName(res.name);
      } else if (res.type === 'answer') {
        console.log(res);
        setConnectType('sender');
        peerConnection.setRemoteDescription(
          new RTCSessionDescription(res.answer),
          () => {
            console.log('收到answer setRemoteDescription ok');
          },
          error,
        );
      } else if (peerConnection && res.type === 'ice') {
        if (peerConnection && res.candidate && connectType !== 'wait') {
          peerConnection.addIceCandidate(new RTCIceCandidate(res.candidate));
        }
      } else if (res.type === 'list') {
        setUserList(res.list);
      } else if (peerConnection && res.type === 'close') {
        closeHandler();
      }
    };
    ws.onclose = function (evt: any) {
      console.log(evt);
      console.log('Connection closed.');
    };
  }, [name]);

  useEffect(() => {
    const tmpVideo = document.getElementById('video') as any;
    const temp = new RTCPeerConnection();
    peerConnection.onicecandidate = (ice: any) => {
      console.log('onicecandidate');
      if (ice && ice.candidate) {
        if (userList) {
          for (let index = 0; index < userList.length; index++) {
            if (userList[index] === name) continue;
            ws.send(
              JSON.stringify({
                type: 'ice',
                candidate: ice.candidate,
                name,
                targetName: userList[index],
              }),
            );
          }
        }
      }
    };
    temp.ontrack = (s: any) => {
      console.log('ontrack');
      const remoteVideo = document.getElementById('remoteVideo') as any;
      remoteVideo.srcObject = s.streams[0];
      remoteVideo.onloadedmetadata = () => {
        remoteVideo.play();
      };
    };
    setSrcVideo(tmpVideo);
    setPeerConnection(temp);
  }, [userList]);

  useEffect(() => {
    if (sourceOffer)
      peerConnection.setRemoteDescription(
        new RTCSessionDescription(sourceOffer),
        function () {
          peerConnection.createAnswer(function (answer: any) {
            console.log(answer);
            peerConnection.setLocalDescription(
              new RTCSessionDescription(answer),
              function () {
                // send the answer to a server to be forwarded back to the caller (you)
                ws.send(JSON.stringify({ answer: answer, type: 'answer', name, targetName }));
              },
              error,
            );
          }, error);
        },
        error,
      );
  }, [sourceOffer]);
  const handleSuccess = (stream: any) => {
    setShareScreenStartBtn(true);
    for (const track of stream.getTracks()) {
      peerConnection.addTrack(track, stream);
    }
    srcVideo.srcObject = stream;
    srcVideo.onloadedmetadata = () => {
      srcVideo.play();
    };
    peerConnection.createOffer(function (offer: any) {
      peerConnection.setLocalDescription(
        new RTCSessionDescription(offer),
        function () {
          // send the offer to a server to be forwarded to the friend you're calling.
          console.log(userList);
          //setConnectType('sender');
          if (userList) {
            for (let index = 0; index < userList.length; index++) {
              if (userList[index] === name) continue;
              const obj = JSON.stringify({
                offer,
                type: 'offer',
                connectType: 'sender',
                name,
                targetName: userList[index],
              });
              ws.send(obj);
            }
          }
        },
        error,
      );
    }, error);
    // 检测用户已停止共享屏幕 通过浏览器UI共享屏幕。
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      messageApi.info('用户已结束共享屏幕');
      setShareScreenStartBtn(false);
    });
  };
  const handleError = (error: any) => {
    messageApi.info(`getDisplayMedia error: ${error.name}`, error);
  };
  return (
    <PageContainer>
      {contextHolder}
      <Button
        onClick={() => {
          navigator.mediaDevices
            .getDisplayMedia({
              video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { ideal: 15 } },
            })
            .then(handleSuccess, handleError);
        }}
        disabled={shareScreenStartBtn}
      >
        开始共享
      </Button>
      <Button
        onClick={() => {
          createAnswer();
        }}
      >
        接入共享
      </Button>
      <div className="container">
        <h2>本地捕获的屏幕共享流</h2>
        <video id="video" playsInline controls muted loop autoPlay />
        <video id="remoteVideo" playsInline controls muted loop autoPlay />
      </div>
    </PageContainer>
  );
};

export default ShareScreen;
