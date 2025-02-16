"use client";

import useUser from '@/hooks/useUser';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { v4 as uuid } from 'uuid';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Type definitions for route parameters
 */
interface RouteParams {
  roomid?: string;
}

interface RoomProps {
  params: Promise<RouteParams>;
}

/**
 * Constants for timing and configuration
 * RETRY_DELAY: Time between retry attempts
 * JOIN_TIMEOUT: Maximum time to wait for join
 * MEETING_DURATION: 5 hours in seconds (5 * 60 * 60 = 18000)
 * LEAVE_REDIRECT_DELAY: Delay before redirecting after leaving room
 * MAX_RETRIES: Maximum number of retries for network failures
 */
const RETRY_DELAY = 5000;
const JOIN_TIMEOUT = 8000;
const MEETING_DURATION = 18000; // 5 hours in seconds
const LEAVE_REDIRECT_DELAY = 500; // 500ms delay for redirect
const MAX_RETRIES = 3; // Maximum number of retries for network errors

const Room = ({ params }: RoomProps) => {
  const searchParams = useSearchParams();
  const paramsValue = React.use(params);
  const roomId = searchParams.get('roomID') || paramsValue?.roomid;
  const { fullName } = useUser();

  const myCallContainerRef = React.useRef<HTMLDivElement | null>(null);
  const zegoRef = React.useRef<any>(null);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState<number>(0);

  const cleanupMedia = React.useCallback(() => {
    const mediaDevices = navigator.mediaDevices as any;
    if (mediaDevices?.getTracks) {
      mediaDevices.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    const tracks = [...document.getElementsByTagName('video'), ...document.getElementsByTagName('audio')];
    tracks.forEach(track => {
      if (track.srcObject) {
        const mediaStream = track.srcObject as MediaStream;
        mediaStream.getTracks().forEach(track => track.stop());
      }
    });

    if (zegoRef.current) {
      zegoRef.current.destroy();
      zegoRef.current = null;
    }
  }, []);

  const handleLeaveRoom = React.useCallback(() => {
    cleanupMedia();
    setTimeout(() => {
      window.location.href = '/';
    }, LEAVE_REDIRECT_DELAY);
  }, [cleanupMedia]);

  const initializeMeeting = React.useCallback(async () => {
    if (!roomId) {
      setConnectionError('No room ID provided');
      return;
    }

    try {
      const appID = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID!);
      const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET!;

      if (isNaN(appID)) { throw new Error('Invalid App ID');}
      if (!serverSecret) {
        throw new Error('Server Secret is missing');
      }

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomId,
        uuid(),
        fullName || "user" + Date.now(),
        MEETING_DURATION // 5 hours in seconds
      );

      zegoRef.current = ZegoUIKitPrebuilt.create(kitToken);

      if (myCallContainerRef.current) {
        zegoRef.current.joinRoom({
          container: myCallContainerRef.current,
          sharedLinks: [
            {
              name: 'Personal link',
              url: `${window.location.protocol}//${window.location.host}/room/${roomId}`,
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.VideoConference,
          },
          showPreJoinView: true,
          turnOnCameraWhenJoining: false,
          turnOnMicrophoneWhenJoining: false,
          preJoinViewConfig: {
            title: 'Join Meeting',
            message: 'Please test your devices before joining',
          },
          onNetworkStatusError: (err: any) => {
            console.error('Network error:', err);
            setConnectionError('Network connection error. Attempting to reconnect...');
            if (retryCount < MAX_RETRIES) {
              setRetryCount(prevCount => prevCount + 1);
              setTimeout(() => {
                cleanupMedia();
                initializeMeeting();
              }, RETRY_DELAY);
            } else {
              setConnectionError('Maximum retry attempts reached. Please check your network.');
            }
          },
          onConnectionStateChanged: (state: string) => {
            if (state === 'CONNECTED') {
              setConnectionError(null);
              setRetryCount(0); // Reset retry count on successful connection
            }
          },
          onLeaveRoom: handleLeaveRoom,
          onDeviceError: (errorCode: any, message: string) => {
            console.error("Device error:", errorCode, message);
            setConnectionError(`Device error: ${message}`);
          }
        });
      }
    } catch (error) {
      console.error("Zego initialization error:", error);
      setConnectionError('Failed to initialize meeting. Please try again.');
    }
  }, [roomId, fullName, handleLeaveRoom, cleanupMedia, retryCount]);

  React.useEffect(() => {
    initializeMeeting();

    return () => {
      cleanupMedia();
    };
  }, [initializeMeeting, cleanupMedia]);

  if (!roomId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Error</h1>
          <p className="text-gray-600">No room ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="myCallContainer"
        ref={myCallContainerRef}
        style={{ width: '100vw', height: '100vh' }}
      />
      {connectionError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="mb-2">{connectionError}</p>
          <button
            onClick={() => {
              setConnectionError(null);
              cleanupMedia();
              initializeMeeting();
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full"
          >
            Retry
          </button>
        </div>
      )}
      <SpeedInsights />
    </>
  );
};

export default Room;
