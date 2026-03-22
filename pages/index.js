import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const MAX_TURNS = 5;
const MID_SUMMARY_TURN = 3;

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState('fox');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [midSummary, setMidSummary] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, summary, midSummary]);

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const getLastBot = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'bot') return messages[i];
    }
    return null;
  };

  const send = async () => {
    if (loading || !input.trim() || turnCount >= MAX_TURNS) return;
    const text = input.trim();
    const currentPersona = persona;
    const lastBot = getLastBot();
    const prevPersona = lastBot?.persona || null;
    const prevAnswer = lastBot?.text || null;
    const newTurn = turnCount + 1;

    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona: currentPersona,
          history: messages,
          prevPersona,
          prevAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류가 발생했습니다');

      const botMsg = {
        role: 'bot',
        text: data.reply,
        persona: currentPersona,
        followup: data.followup || null,
        nudge: data.nudge || null,
      };

      setMessages([...updatedMessages, botMsg]);
      setTurnCount(newTurn);

      if (newTurn === MID_SUMMARY_TURN) {
        fetchMidSummary([...updatedMessages, botMsg]);
      }
    } catch (err) {
      setMessages([...updatedMessages, { role: 'bot', text: '오류: ' + err.message, persona: currentPersona }]);
      setTurnCount(newTurn);
    } finally {
      setLoading(false);
    }
  };

  const fetchMidSummary = async (currentMessages) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: 'fox',
          history: currentMessages,
          isSummary: true,
          summaryType: 'mid',
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        const lines = data.reply.split('\n').filter(Boolean);
        const flowLine = lines.find(l => l.includes('발산한 것') || l.includes('수렴한 것'));
        if (flowLine) setMidSummary(flowLine);
        else setMidSummary('지금까지 다양한 방향으로 탐색이 이어지고 있어요.');
      }
    } catch (e) {}
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: 'fox',
          history: messages,
          isSummary: true,
        }),
      });
      const data = await res.json();
      if (res.ok) setSummary(data.reply);
    } catch (e) {
      setSummary('요약을 불러오는 데 실패했습니다.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const setFollowupInput = (text) => {
    setInput(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 130) + 'px';
    }
  };

  const isDone = turnCount >= MAX_TURNS;

  return (
    <>
      <Head>
        <title>여우와 고슴도치</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&family=Noto+Sans+KR:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="container">
        <div className="header">
          <span className="icons">🦊🦔</span>
          <div style={{ flex: 1 }}>
            <div className="title">여우와 고슴도치</div>
            <div className="subtitle">두 가지 사고방식으로 질문에 답합니다</div>
          </div>
          <div className="turn-counter">
            {Array.from({ length: MAX_TURNS }).map((_, i) => (
              <div key={i} className={`turn-dot ${i < turnCount ? 'done' : ''}`} />
            ))}
          </div>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              <div className="empty-icons">🦊🦔</div>
              <div className="empty-title">무엇이든 물어보세요</div>
              <div className="empty-desc">
                <b>🦊 여우</b>는 다양한 관점으로 발산합니다<br />
                <b>🦔 고슴도치</b>는 본질로 수렴합니다
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`msg ${msg.role} ${msg.persona || ''}`}>
                {msg.role === 'user' && <div className="label">나</div>}
                {msg.role === 'bot' && (
                  <div className={`tag ${msg.persona}`}>
                    {msg.persona === 'fox' ? '🦊 여우' : '🦔 고슴도치'}
                  </div>
                )}
                <div className="bubble">{msg.text}</div>
              </div>

              {msg.role === 'bot' && (msg.followup || msg.nudge) && (
                <div className="hints">
                  {msg.followup && (
                    <button className="hint-followup" onClick={() => setFollowupInput(msg.followup)}>
                      💬 {msg.followup}
                    </button>
                  )}
                  {msg.nudge && (
                    <div className="hint-nudge">{msg.nudge}</div>
                  )}
                </div>
              )}

              {msg.role === 'bot' && turnCount === MID_SUMMARY_TURN && i === messages.length - 1 && midSummary && (
                <div className="mid-summary">
                  📍 {midSummary}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className={`msg bot ${persona}`}>
              <div className={`tag ${persona}`}>{persona === 'fox' ? '🦊 여우' : '🦔 고슴도치'}</div>
              <div className="bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {isDone && !summary && (
            <div className="done-area">
              <div className="done-msg">5번의 탐색이 끝났어요.</div>
              <button className="summary-btn" onClick={fetchSummary} disabled={summaryLoading}>
                {summaryLoading ? '요약 중...' : '🗂 이 대화 요약하기'}
              </button>
            </div>
          )}

          {summary && (
            <div className="summary-box">
              <div className="summary-title">탐색 요약</div>
              <div className="summary-text">{summary}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!isDone && (
          <div className="input-area">
            <div className="persona-bar">
              <button
                className={`p-btn ${persona === 'fox' ? 'fox-active' : ''}`}
                onClick={() => setPersona('fox')}
              >
                🦊 여우
              </button>
              <button
                className={`p-btn ${persona === 'hedgehog' ? 'hedgehog-active' : ''}`}
                onClick={() => setPersona('hedgehog')}
              >
                🦔 고슴도치
              </button>
            </div>
            <div className="row">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요... (Enter로 전송)"
                rows={1}
                disabled={loading}
              />
              <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Noto Sans KR', sans-serif;
          background: #F7F5F0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
      `}</style>

      <style jsx>{`
        .container {
          width: 100%; max-width: 680px;
          background: #fff; border-radius: 24px;
          border: 1px solid #E8E4DC; overflow: hidden;
          display: flex; flex-direction: column;
          height: 92vh; max-height: 860px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.06);
        }
        .header {
          padding: 18px 24px 14px;
          border-bottom: 1px solid #E8E4DC;
          display: flex; align-items: center; gap: 12px;
        }
        .icons { font-size: 22px; letter-spacing: 2px; }
        .title { font-family: 'Noto Serif KR', serif; font-size: 17px; font-weight: 600; color: #1A1814; }
        .subtitle { font-size: 11px; color: #8A8580; margin-top: 2px; }
        .turn-counter { display: flex; gap: 5px; align-items: center; }
        .turn-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #E8E4DC; transition: background 0.3s;
        }
        .turn-dot.done { background: #1A1814; }

        .messages {
          flex: 1; overflow-y: auto;
          padding: 20px 24px;
          display: flex; flex-direction: column; gap: 12px;
          scroll-behavior: smooth;
        }
        .messages::-webkit-scrollbar { width: 4px; }
        .messages::-webkit-scrollbar-thumb { background: #E8E4DC; border-radius: 2px; }

        .empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 2rem; text-align: center; margin: auto;
        }
        .empty-icons { font-size: 40px; letter-spacing: 12px; }
        .empty-title { font-family: 'Noto Serif KR', serif; font-size: 18px; color: #1A1814; }
        .empty-desc { font-size: 13px; color: #8A8580; line-height: 1.9; }

        .msg { display: flex; flex-direction: column; gap: 5px; max-width: 82%; }
        .msg.user { align-self: flex-end; align-items: flex-end; }
        .msg.bot { align-self: flex-start; align-items: flex-start; }
        .label { font-size: 11px; color: #8A8580; padding: 0 4px; font-weight: 500; }
        .tag {
          font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .tag.fox { background: #FDF3E3; color: #C9853A; border: 1px solid #F0C98A; }
        .tag.hedgehog { background: #F0EEFF; color: #6B5CE7; border: 1px solid #B8AEFF; }
        .bubble {
          padding: 12px 16px; border-radius: 16px;
          font-size: 14px; line-height: 1.75; border: 1px solid #E8E4DC;
        }
        .msg.user .bubble { background: #1A1814; color: #fff; border-color: transparent; border-top-right-radius: 4px; }
        .msg.bot .bubble { background: #fff; color: #1A1814; border-top-left-radius: 4px; white-space: pre-wrap; word-break: keep-all; }
        .msg.bot.fox .bubble { border-color: #F0C98A; }
        .msg.bot.hedgehog .bubble { border-color: #B8AEFF; }

        .typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; min-width: 44px; }
        .typing span {
          width: 7px; height: 7px; border-radius: 50%;
          background: #8A8580; animation: blink 1.2s infinite; display: inline-block;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%,80%,100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }

        .hints { margin-top: 6px; display: flex; flex-direction: column; gap: 5px; max-width: 82%; }
        .hint-followup {
          text-align: left; padding: 7px 12px;
          background: #FAFAF8; border: 1px dashed #E8E4DC;
          border-radius: 10px; font-size: 12px; color: #5A5650;
          cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.15s; line-height: 1.5;
        }
        .hint-followup:hover { background: #F5F2EC; border-color: #C8C4BC; color: #1A1814; }
        .hint-nudge { font-size: 11px; color: #8A8580; padding: 0 4px; font-style: italic; }

        .mid-summary {
          margin-top: 6px;
          padding: 8px 12px;
          background: #F5F2EC;
          border-radius: 8px;
          font-size: 12px;
          color: #5A5650;
          border-left: 2px solid #C8C4BC;
        }

        .done-area {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 16px 0;
        }
        .done-msg { font-size: 13px; color: #8A8580; }
        .summary-btn {
          padding: 10px 24px; border-radius: 20px;
          border: 1.5px solid #1A1814; background: transparent;
          font-size: 13px; color: #1A1814; cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.2s;
        }
        .summary-btn:hover { background: #1A1814; color: #fff; }
        .summary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .summary-box {
          background: #F7F5F0; border-radius: 12px;
          border: 1px solid #E8E4DC; padding: 16px 20px;
        }
        .summary-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 13px; font-weight: 600;
          color: #1A1814; margin-bottom: 10px;
        }
        .summary-text { font-size: 13px; color: #3A3830; line-height: 1.9; white-space: pre-wrap; }

        .input-area {
          padding: 14px 24px 18px;
          border-top: 1px solid #E8E4DC;
          display: flex; flex-direction: column; gap: 10px;
        }
        .persona-bar { display: flex; gap: 8px; }
        .p-btn {
          padding: 6px 16px; border-radius: 20px;
          border: 1.5px solid #E8E4DC;
          background: transparent; font-size: 13px; cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif; color: #8A8580; transition: all 0.2s;
        }
        .p-btn:hover { border-color: #ccc; color: #1A1814; }
        .p-btn.fox-active { border-color: #C9853A; background: #FDF3E3; color: #C9853A; font-weight: 500; }
        .p-btn.hedgehog-active { border-color: #6B5CE7; background: #F0EEFF; color: #6B5CE7; font-weight: 500; }

        .row { display: flex; gap: 10px; align-items: flex-end; }
        textarea {
          flex: 1; padding: 10px 14px;
          border: 1px solid #E8E4DC; border-radius: 12px;
          font-size: 14px; font-family: 'Noto Sans KR', sans-serif;
          background: #FAFAF8; color: #1A1814;
          resize: none; min-height: 42px; max-height: 130px;
          line-height: 1.55; outline: none; transition: border-color 0.2s;
        }
        textarea:focus { border-color: #bbb; background: #fff; }
        textarea::placeholder { color: #8A8580; }
        textarea:disabled { opacity: 0.5; }
        .send-btn {
          width: 42px; height: 42px; border-radius: 12px;
          border: none; background: #1A1814; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: opacity 0.2s;
        }
        .send-btn:hover { opacity: 0.8; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .send-btn svg { width: 16px; height: 16px; }
      `}</style>
    </>
  );
}
