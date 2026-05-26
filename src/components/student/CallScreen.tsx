// ── Main call logic with robust fallback ────────────────────────────────────
useEffect(() => {
  if (previousContext === null) return;

  cancelledRef.current = false;
  assistantIndexRef.current = 0;

  let freeSecondsUsedLocal = 0;
  let attemptId = 0;

  const hardStop = () => {
    try { vapiRef.current?.stop(); } catch {}
    vapiRef.current = null;
  };

  const startTimerIfNeeded = () => {
    if (startedTimerRef.current) return;
    startedTimerRef.current = true;

    const remainingSeconds = isInnerCircle
      ? INNER_CIRCLE_SECONDS
      : FREE_TRIAL_SECONDS - freeSecondsUsedLocal + topUpSeconds;

    timerRef.current = setInterval(() => {
      setDuration((d) => {
        const next = d + 1;
        if (next === remainingSeconds - 30) setTimeWarning(true);
        if (next >= remainingSeconds) {
          window.clearInterval(timerRef.current!);
          hangup(true);
          return remainingSeconds;
        }
        return next;
      });
    }, 1000);
  };

  const tryNext = async () => {
    const myAttempt = ++attemptId;

    if (cancelledRef.current) return;

    if (assistantIndexRef.current >= ASSISTANTS.length) {
      stopRinging();
      setError("All coaching sessions are currently busy. Please try again in a few minutes.");
      setStatus("ending");
      return;
    }

    const { publicKey, assistantId } = ASSISTANTS[assistantIndexRef.current];
    const slotNumber = assistantIndexRef.current + 1;
    assistantIndexRef.current++;

    setStatus("connecting");
    setError(null);

    console.log(`[VAPI] Attempt ${myAttempt}: trying ${slotNumber}/${ASSISTANTS.length}`, {
      assistantId,
      publicKey,
    });

    // ensure old instance is dead
    hardStop();

    // small backoff helps browser audio/mic settle
    await new Promise((r) => setTimeout(r, 400));
    if (cancelledRef.current || myAttempt !== attemptId) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    let gotCallStart = false;

    const connectTimeout = setTimeout(() => {
      if (cancelledRef.current || myAttempt !== attemptId) return;
      if (!gotCallStart) {
        console.log(`[VAPI] Attempt ${myAttempt}: no call-start in time -> failover`);
        hardStop();
        tryNext();
      }
    }, 20000);

    const safe = (fn: () => void) => {
      if (cancelledRef.current) return;
      if (myAttempt !== attemptId) return; // ignore stale events
      fn();
    };

    vapi.on("call-start", () => safe(() => {
      gotCallStart = true;
      clearTimeout(connectTimeout);
      stopRinging();
      setStatus("waiting-agent");
      console.log(`[VAPI] Attempt ${myAttempt}: call-start`);
    }));

    vapi.on("speech-start", () => safe(() => {
      setAgentSpeaking(true);
      setStatus("connected");
      startTimerIfNeeded();
      console.log(`[VAPI] Attempt ${myAttempt}: speech-start`);
    }));

    vapi.on("speech-end", () => safe(() => {
      setAgentSpeaking(false);
    }));

    vapi.on("error", (err: any) => safe(() => {
      console.log(`[VAPI] Attempt ${myAttempt}: error`, err);
      clearTimeout(connectTimeout);
      hardStop();
      tryNext();
    }));

    vapi.on("call-end", () => safe(() => {
      console.log(`[VAPI] Attempt ${myAttempt}: call-end`);
      clearTimeout(connectTimeout);

      // if it ended before ever starting, failover
      if (!gotCallStart) {
        hardStop();
        tryNext();
        return;
      }

      // normal end
      stopRinging();
      saveUsage(durationRef.current);
      saveMemory();
      cleanup();
      onClose();
    }));

    vapi.on("message", (msg: any) => safe(() => {
      if (msg?.type === "transcript" && msg?.transcript) {
        messagesRef.current.push(`${msg.role}: ${msg.transcript}`);
      }
    }));

    const memoryContext = previousContext
      ? `IMPORTANT: This student has spoken with you before. ${previousContext}. Continue from where you left off.`
      : `This is ${firstName}'s first session. Welcome them warmly and ask what skill they want to monetize.`;

    try {
      // IMPORTANT: for @vapi-ai/web ^2.5.2 use object signature
      await vapi.start({
        assistantId,
        assistantOverrides: {
          variableValues: {
            studentKey: session,
            name: firstName,
            student_name: firstName,
            memory_context: memoryContext,
            is_returning: isReturning ? "yes" : "no",
            plan: isInnerCircle ? "Inner Circle member" : "trial student",
            minutes_available: String(
              Math.floor(
                (isInnerCircle
                  ? INNER_CIRCLE_SECONDS
                  : FREE_TRIAL_SECONDS - freeSecondsUsedLocal + topUpSeconds) / 60
              )
            ),
          },
        },
        // If this is not a real Vapi Session (chat), remove it:
        // sessionId: vapiSessionId || undefined,
      });

      console.log(`[VAPI] Attempt ${myAttempt}: start() resolved`);
    } catch (e) {
      console.log(`[VAPI] Attempt ${myAttempt}: start() threw`, e);
      clearTimeout(connectTimeout);
      hardStop();
      tryNext();
    }
  };

  const startCall = async () => {
    if (!isInnerCircle) {
      const secondsUsed = await checkUsage();
      freeSecondsUsedLocal = secondsUsed;
      setFreeSecondsUsed(secondsUsed);

      const remainingSeconds = FREE_TRIAL_SECONDS - secondsUsed + topUpSeconds;
      if (remainingSeconds <= 0) {
        stopRinging();
        setBlockedNoMinutes(true);
        setStatus("ending");
        return;
      }
    }
    tryNext();
  };

  startCall();

  return () => {
    cancelledRef.current = true;
    stopRinging();
    hardStop();
    cleanup();
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [previousContext]);
