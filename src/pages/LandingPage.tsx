import { useState, useEffect } from 'react';


const ComingSoon = () => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = 'https://sussexmasons.org.uk';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mx-auto w-64 h-64 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <img src="PGL3.png" alt="" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
          The Sussex Masonic App
        </h1>

        {/* Coming Soon Text */}
        <p className="text-xl md:text-2xl text-black mb-6">
          coming soon in December
        </p>

        {/* Countdown Redirect */}
        <div className="mt-8">
          <p className="text-lg text-black mb-2">
            Redirecting you to the main site in
          </p>
          <div className="text-6xl font-bold text-black">
            {countdown}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;