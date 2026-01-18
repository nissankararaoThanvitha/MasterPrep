import { useState } from "react";

function AnswerCard({ question, answer, children }) {
  const [show, setShow] = useState(false);

  return (
    <>
      {children(
        show,
        () => setShow(!show)
      )}

      {show && (
        <div
          style={{
            marginTop: "10px",
            background: "#eef2ff",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          <b>Answer:</b>
          <p>{answer}</p>
        </div>
      )}
    </>
  );
}

export default AnswerCard;
