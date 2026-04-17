import { useState, useRef, useEffect } from "react";
import { validateForm } from "./validateForm";
import { submitContactForm } from "./submitContactForm";

export function useContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [responseMessage, setResponseMessage] = useState("");
  const timeoutRef = useRef(null);
  const lastSubmissionRef = useRef(null);
  const formStartTimeRef = useRef(Date.now());

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.target;
    const formDataToSend = new FormData(form);
    const validation = validateForm(
      formDataToSend,
      lastSubmissionRef.current,
      formStartTimeRef.current,
    );
    if (!validation.valid) {
      setStatus("error");
      setResponseMessage(validation.message);
      return;
    }

    setStatus("sending");

    try {
      const result = await submitContactForm(formDataToSend, formData);
      lastSubmissionRef.current = Date.now();
      setStatus("success");
      setResponseMessage(result.message);
      formStartTimeRef.current = Date.now();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setResponseMessage("");
        timeoutRef.current = null;
      }, 6000);

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Form submit error:", err);
      setStatus("error");

      let errorMessage = "Something went wrong. Please try again later.";
      if (err && err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError) {
        errorMessage =
          "Network error: Unable to connect to the server. Please check your internet connection or try again later. You can also reach me directly at illona@oceaniccoder.dev";
      } else if (err.name === "AbortError") {
        errorMessage =
          "Request timed out. Please check your internet connection and try again.";
      }

      if (
        !errorMessage.includes("info@illonaaddae.com") &&
        !errorMessage.includes("email")
      ) {
        errorMessage +=
          " Alternatively, you can contact me directly at info@illonaaddae.com";
      }

      setResponseMessage(errorMessage);
    }
  };

  return { formData, status, responseMessage, handleInputChange, handleSubmit };
}
