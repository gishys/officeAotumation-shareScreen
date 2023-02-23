import { PageContainer } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { useEffect, useState } from 'react';

const ShareScreen: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [shareScreenStartBtn, setShareScreenStartBtn] = useState(true);
  useEffect(() => {
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      setShareScreenStartBtn(false);
    } else {
      messageApi.info('此设备不支持屏幕共享！');
    }
  }, []);
  const handleSuccess = (stream: any) => {
    setShareScreenStartBtn(true);
    const video = document.getElementById('srcVideo') as any;
    video.srcObject = stream;
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
      <div className="container">
        <h2>本地捕获的屏幕共享流</h2>
        <video id="srcVideo" playsInline controls muted loop autoPlay />
      </div>
    </PageContainer>
  );
};

export default ShareScreen;
