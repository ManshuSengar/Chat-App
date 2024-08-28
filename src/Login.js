import React, { useState } from "react";
import axios from "axios";

const Login = ({ setUser, setUserToken }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);

  const handleLogin = async (phoneNumber) => {
    try {
      console.log("phoneNumber", phoneNumber);
      const response = await axios.post("http://localhost:8080/api/login", {
        phoneNo: phoneNumber,
      });
      console.log("response--> ", response);
      if (response.data.status) {
        console.log("response--> ", response.data.success);
        setStep(2);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/verify-otp",
        {
          phoneNo: phoneNumber,
          otp,
        }
      );
      if (response.data.status) {
        console.log("response.data.status--> ", response.data);
        setUser(response.data.data);
        setUserToken(response.data.token);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {step === 1 ? (
        <div>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Phone Number"
          />
          <button onClick={() => handleLogin(phoneNumber)}>Send OTP</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="OTP"
          />
          <button onClick={handleVerifyOtp}>Verify OTP</button>
        </div>
      )}
    </div>
  );
};

export default Login;
