"use client"; // Enable client-side rendering

// Import necessary dependencies
import Image from "next/image";
import useUser from "@/hooks/useUser";
import { useEffect, useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { SpeedInsights } from "@vercel/speed-insights/next"

// Home Component
export default function Home() {
  // Get user name management from custom hook
  const { fullName, setFullName } = useUser();

  // State for room ID input
  const [roomId, setRoomId] = useState("");

  // Router for navigation
  const router = useRouter();

  // useTransition for smooth navigation
  const [isPending, startTransition] = useTransition();

  // Reset user name when component mounts
  useEffect(() => {
    setFullName("");
  }, []);

  // Memoize the room ID validation check
  const isRoomIdValid = useMemo(() => roomId.length > 0, [roomId]);

  // Handler for connecting to the room
  const handleConnect = useCallback(() => {
    if (roomId) {
      startTransition(() => {
        router.push(`/room/${roomId}`);
      });
    }
  }, [roomId, router]);

  // Handler for creating a new room
  const handleCreateRoom = useCallback(() => {
    const newRoomId = uuid();
    startTransition(() => {
      router.push(`/room/${newRoomId}`);
    });
  }, [router]);

  // Prefetch the room page in the background
  useEffect(() => {
    router.prefetch("/room/[roomId]");
  }, [router]);

  return (
    <div className="w-full h-screen">
      {/* Main section with dark theme */}
      <section className="bg-gray-900 text-white">
        <div className="mx-auto max-w-screen-xl px-4 py-32 flex flex-col items-center justify-center h-screen">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Logo/Brand Image */}
            <div className="w-full md:w-3/4 lg:w-1/2">
              <Image
                src="/alive.png"
                alt="Alive"
                width={600}
                height={100}
                layout="responsive"
                priority // Ensure the image loads quickly
              />
            </div>
            <div className="max-w-4xl mt-6 w-full px-4">
              {/* Platform description */}
              <p className="text-sm sm:text-xl/relaxed text-gray-400">
                Alive is a platform for connecting your soulmate with video calls.
              </p>
              {/* Name input section */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full">
                <input
                  type="text"
                  id="name"
                  onChange={(e) => setFullName(e.target.value.toString())}
                  placeholder="Enter Your Name"
                  className="border rounded-md focus:outline-none focus:border-transparent focus:ring-0 px-4 py-2 w-full sm:w-auto text-black"
                />
              </div>
              {/* Room joining section - only shown when name is valid (3+ characters) */}
              {fullName && fullName.length >= 3 && (
                <>
                  {/* Room ID input and connect button */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full">
                    <input
                      type="text"
                      id="roomid"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Enter room id to connect with us"
                      className="border rounded-md focus:outline-none focus:border-transparent focus:ring-0 px-4 py-2 w-full sm:w-auto text-black"
                    />
                    <button
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer w-full sm:w-auto"
                      onClick={handleConnect}
                      disabled={!isRoomIdValid || isPending} // Disable if no room ID entered or pending navigation
                    >
                      {isPending ? "Connecting..." : "Connect"}
                    </button>
                  </div>
                  {/* Create new room button */}
                  <div>
                    <button
                      className="text-sm sm:text-lg font-medium mt-4 text-white hover:text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300 cursor-pointer relative group w-full sm:w-auto"
                      onClick={handleCreateRoom}
                      disabled={isPending} // Disable if pending navigation
                    >
                      {isPending ? "Creating Room..." : "Or Create Room"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}